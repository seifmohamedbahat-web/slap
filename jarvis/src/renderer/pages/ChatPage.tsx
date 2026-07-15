import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { relativeTime } from "../lib/format";
import type { AiProviderId, ChatMessage, Conversation } from "@shared/types";
import { Button, GlassCard, cx, useToast } from "../components/ui";
import { Icon } from "../components/Icon";

const PROVIDER_LABEL: Record<AiProviderId, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude",
};

export function ChatPage() {
  const { push } = useToast();
  const conversations = useAsync(() => api.invoke("ai:conversations:list", undefined), []);
  const keys = useAsync(() => api.invoke("keys:list", undefined), []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState<{ text: string; provider?: AiProviderId; model?: string } | null>(null);
  const [input, setInput] = useState("");
  const requestIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const configuredProviders = (keys.data ?? [])
    .filter((k) => ["openai", "gemini", "claude"].includes(k.provider) && k.configured)
    .map((k) => k.provider as AiProviderId);

  // Auto-select the first conversation.
  useEffect(() => {
    if (!activeId && conversations.data && conversations.data.length > 0) {
      setActiveId(conversations.data[0].id);
    }
  }, [conversations.data, activeId]);

  // Load messages for the active conversation.
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void api.invoke("ai:messages:list", { conversationId: activeId }).then(setMessages);
  }, [activeId]);

  // Subscribe to the AI stream.
  useEffect(() => {
    const off = api.on("ai:stream", (event) => {
      if (event.requestId !== requestIdRef.current) return;
      if (event.type === "provider") {
        setStreaming((s) => ({ text: s?.text ?? "", provider: event.provider, model: event.model }));
      } else if (event.type === "delta") {
        setStreaming((s) => ({ ...(s ?? { text: "" }), text: (s?.text ?? "") + (event.delta ?? "") }));
      } else if (event.type === "done") {
        requestIdRef.current = null;
        setStreaming(null);
        if (event.message) setMessages((m) => [...m, event.message!]);
        void conversations.reload();
      } else if (event.type === "error") {
        requestIdRef.current = null;
        setStreaming(null);
        push(event.error ?? "AI error", "error");
      }
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push]);

  // Autoscroll.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming?.text]);

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content || requestIdRef.current) return;
    if (configuredProviders.length === 0) {
      push("Add an AI provider key first (Settings → API Keys).", "error");
      return;
    }
    let conversationId = activeId;
    if (!conversationId) {
      const conv = await api.invoke("ai:conversations:create", {});
      conversationId = conv.id;
      setActiveId(conv.id);
      await conversations.reload();
    }
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      conversationId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    setStreaming({ text: "" });
    const { requestId } = await api.invoke("ai:chat:start", { conversationId, content });
    requestIdRef.current = requestId;
  }, [input, activeId, configuredProviders.length, conversations, push]);

  const stop = useCallback(() => {
    if (requestIdRef.current) {
      void api.invoke("ai:chat:cancel", { requestId: requestIdRef.current });
      requestIdRef.current = null;
      setStreaming(null);
    }
  }, []);

  async function newConversation() {
    const conv = await api.invoke("ai:conversations:create", {});
    await conversations.reload();
    setActiveId(conv.id);
  }

  async function deleteConversation(id: string) {
    await api.invoke("ai:conversations:delete", { id });
    await conversations.reload();
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className="flex h-full gap-4">
      {/* Conversation list */}
      <div className="flex w-64 shrink-0 flex-col">
        <Button variant="primary" icon="plus" onClick={newConversation} className="mb-3 w-full">
          New chat
        </Button>
        <div className="flex-1 scroll-area space-y-1.5">
          {(conversations.data ?? []).map((c: Conversation) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={cx(
                "group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
                activeId === c.id ? "bg-neon-500/14" : "hover:bg-white/5",
              )}
            >
              <Icon name="chat" size={16} className="shrink-0 text-ink-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-primary">{c.title}</p>
                <p className="text-[11px] text-ink-muted">{relativeTime(c.updatedAt)}</p>
              </div>
              <span
                className="opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteConversation(c.id);
                }}
              >
                <Icon name="trash" size={14} className="text-ink-muted hover:text-status-critical" />
              </span>
            </button>
          ))}
          {(conversations.data ?? []).length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-ink-muted">No conversations yet.</p>
          )}
        </div>
      </div>

      {/* Chat surface */}
      <GlassCard className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 scroll-area px-6 py-5">
          {messages.length === 0 && !streaming ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neon-500/12 text-neon-400">
                <Icon name="sparkles" size={26} />
              </div>
              <p className="font-medium text-ink-primary">How can I help?</p>
              <p className="max-w-sm text-sm text-ink-muted">
                Ask a question, request code, or give me a task. Coding routes to Claude, research to
                Gemini, and general chat to OpenAI — configurable in Settings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {streaming && (
                <MessageBubble
                  message={{
                    id: "streaming",
                    conversationId: activeId ?? "",
                    role: "assistant",
                    content: streaming.text,
                    provider: streaming.provider,
                    model: streaming.model,
                    createdAt: new Date().toISOString(),
                  }}
                  live
                />
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/8 p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Message JARVIS…  (Enter to send, Shift+Enter for newline)"
              className="input max-h-40 flex-1 resize-none"
            />
            {streaming ? (
              <Button variant="danger" icon="stop" onClick={stop}>
                Stop
              </Button>
            ) : (
              <Button variant="primary" icon="send" onClick={send} disabled={!input.trim()}>
                Send
              </Button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function MessageBubble({ message, live }: { message: ChatMessage; live?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={cx("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-white/8 text-ink-secondary" : "bg-neon-500/15 text-neon-300",
        )}
      >
        <Icon name={isUser ? "profile" : "sparkles"} size={16} />
      </div>
      <div className={cx("max-w-[76%] min-w-0", isUser && "text-right")}>
        <div
          className={cx(
            "inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser ? "bg-neon-500/15 text-ink-primary" : "glass text-ink-secondary",
          )}
        >
          {message.content}
          {live && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-neon-400 align-middle" />}
        </div>
        {!isUser && message.provider && (
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-muted">
            <Icon name="bolt" size={11} />
            {PROVIDER_LABEL[message.provider]} · {message.model}
          </p>
        )}
      </div>
    </div>
  );
}
