/**
 * The AI router: picks a provider for each request (explicit override →
 * task routing → default), streams the completion, and transparently falls
 * back to the next configured provider when one fails. Also owns
 * conversation/message persistence.
 */
import type { Database } from "../../core/db";
import { newId, nowIso } from "../../core/db";
import { logger } from "../../core/logger";
import { getSettings } from "../../core/settings";
import type {
  AiProviderId,
  AiStreamEvent,
  ChatMessage,
  ChatRequest,
  Conversation,
} from "@shared/types";
import type { AiProvider, ProviderMessage } from "./types";
import { ProviderError } from "./types";
import { openaiProvider } from "./providers/openai";
import { geminiProvider } from "./providers/gemini";
import { claudeProvider } from "./providers/claude";

export const PROVIDERS: Record<AiProviderId, AiProvider> = {
  openai: openaiProvider,
  gemini: geminiProvider,
  claude: claudeProvider,
};

const BASE_SYSTEM_PROMPT = [
  "You are JARVIS, a personal AI operating system assistant running on the user's desktop.",
  "Be natural, professional, and concise. Answer in the same language the user writes in",
  "(you understand English and Egyptian Arabic). If a request is unclear, ask a short",
  "follow-up question instead of guessing.",
].join(" ");

export interface RouterDeps {
  db: Database;
  getApiKey: (provider: string) => string | null;
  /** Renders long-term memory into a system prompt fragment. */
  getMemoryContext: () => string;
  emit: (event: AiStreamEvent) => void;
}

export class AiRouter {
  private active = new Map<string, AbortController>();

  constructor(private deps: RouterDeps) {}

  // -- conversations ---------------------------------------------------------

  listConversations(): Conversation[] {
    const rows = this.deps.db
      .prepare("SELECT * FROM conversations ORDER BY updated_at DESC")
      .all() as Record<string, string>[];
    return rows.map(rowToConversation);
  }

  createConversation(opts: { title?: string; provider?: AiProviderId; model?: string }): Conversation {
    const settings = getSettings(this.deps.db);
    const provider = opts.provider ?? settings.defaultProvider;
    const model = opts.model ?? settings.defaultModels[provider];
    const conv: Conversation = {
      id: newId(),
      title: opts.title ?? "New conversation",
      provider,
      model,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.deps.db
      .prepare(
        "INSERT INTO conversations (id, title, provider, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(conv.id, conv.title, conv.provider, conv.model, conv.createdAt, conv.updatedAt);
    return conv;
  }

  deleteConversation(id: string): void {
    this.deps.db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
    this.deps.db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  }

  renameConversation(id: string, title: string): void {
    this.deps.db
      .prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?")
      .run(title, nowIso(), id);
  }

  listMessages(conversationId: string): ChatMessage[] {
    const rows = this.deps.db
      .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
      .all(conversationId) as Record<string, string>[];
    return rows.map(rowToMessage);
  }

  // -- chat ------------------------------------------------------------------

  /** Kicks off a streamed chat turn; events flow through deps.emit. */
  startChat(request: ChatRequest): { requestId: string } {
    const requestId = newId();
    const controller = new AbortController();
    this.active.set(requestId, controller);
    void this.runChat(requestId, request, controller).finally(() => {
      this.active.delete(requestId);
    });
    return { requestId };
  }

  cancel(requestId: string): void {
    this.active.get(requestId)?.abort();
  }

  private providerChain(request: ChatRequest): { provider: AiProviderId; model: string }[] {
    const settings = getSettings(this.deps.db);
    const first: AiProviderId =
      request.provider ??
      (request.task ? settings.taskRouting[request.task] : settings.defaultProvider);
    const order: AiProviderId[] = [
      first,
      ...settings.fallbackOrder.filter((p) => p !== first),
    ];
    return order
      .filter((p) => this.deps.getApiKey(p) !== null)
      .map((provider) => ({
        provider,
        model:
          provider === first && request.model
            ? request.model
            : settings.defaultModels[provider],
      }));
  }

  private async runChat(
    requestId: string,
    request: ChatRequest,
    controller: AbortController,
  ): Promise<void> {
    const { db, emit } = this.deps;
    const userMessage: ChatMessage = {
      id: newId(),
      conversationId: request.conversationId,
      role: "user",
      content: request.content,
      createdAt: nowIso(),
    };
    insertMessage(db, userMessage);
    autoTitle(db, request.conversationId, request.content);

    const history: ProviderMessage[] = this.listMessages(request.conversationId)
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const system = `${BASE_SYSTEM_PROMPT}\n\n${this.deps.getMemoryContext()}`.trim();
    const chain = this.providerChain(request);
    if (chain.length === 0) {
      emit({
        requestId,
        type: "error",
        error: "No AI provider is configured. Add an API key in Settings → API Keys.",
      });
      return;
    }

    let lastError = "";
    for (const { provider, model } of chain) {
      if (controller.signal.aborted) break;
      const apiKey = this.deps.getApiKey(provider);
      if (!apiKey) continue;
      emit({ requestId, type: "provider", provider, model });
      try {
        const text = await PROVIDERS[provider].chat({
          apiKey,
          model,
          system,
          messages: history,
          signal: controller.signal,
          onDelta: (delta) => emit({ requestId, type: "delta", delta }),
        });
        const assistantMessage: ChatMessage = {
          id: newId(),
          conversationId: request.conversationId,
          role: "assistant",
          content: text,
          provider,
          model,
          createdAt: nowIso(),
        };
        insertMessage(db, assistantMessage);
        touchConversation(db, request.conversationId, provider, model);
        emit({ requestId, type: "done", message: assistantMessage });
        return;
      } catch (err) {
        if (controller.signal.aborted) {
          emit({ requestId, type: "error", error: "Cancelled" });
          return;
        }
        lastError = err instanceof Error ? err.message : String(err);
        logger.warn("ai", `Provider ${provider} failed; trying next`, { error: lastError });
        if (err instanceof ProviderError && !err.retryable) {
          // Auth/config errors on this provider — still try the others.
          continue;
        }
      }
    }
    emit({
      requestId,
      type: "error",
      error: `All configured providers failed. Last error: ${lastError}`,
    });
  }
}

// -- helpers -----------------------------------------------------------------

function insertMessage(db: Database, m: ChatMessage): void {
  db.prepare(
    "INSERT INTO messages (id, conversation_id, role, content, provider, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(m.id, m.conversationId, m.role, m.content, m.provider ?? null, m.model ?? null, m.createdAt);
}

function touchConversation(db: Database, id: string, provider: string, model: string): void {
  db.prepare(
    "UPDATE conversations SET updated_at = ?, provider = ?, model = ? WHERE id = ?",
  ).run(nowIso(), provider, model, id);
}

function autoTitle(db: Database, conversationId: string, firstMessage: string): void {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?")
    .get(conversationId) as { n: number };
  if (row.n <= 1) {
    const title = firstMessage.replace(/\s+/g, " ").trim().slice(0, 48) || "New conversation";
    db.prepare("UPDATE conversations SET title = ? WHERE id = ?").run(title, conversationId);
  }
}

function rowToConversation(r: Record<string, string>): Conversation {
  return {
    id: r.id,
    title: r.title,
    provider: r.provider as AiProviderId,
    model: r.model,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToMessage(r: Record<string, string>): ChatMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role as ChatMessage["role"],
    content: r.content,
    provider: (r.provider ?? undefined) as AiProviderId | undefined,
    model: r.model ?? undefined,
    createdAt: r.created_at,
  };
}
