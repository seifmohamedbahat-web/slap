import type { AiProviderId } from "@shared/types";

export interface ProviderMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProviderChatOptions {
  apiKey: string;
  model: string;
  system: string;
  messages: ProviderMessage[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

export interface AiProvider {
  id: AiProviderId;
  /** Default model catalog; users can type any model id in settings. */
  models: string[];
  /** Streams a completion, invoking onDelta per chunk; resolves to full text. */
  chat(options: ProviderChatOptions): Promise<string>;
}

export class ProviderError extends Error {
  constructor(
    public provider: AiProviderId,
    message: string,
    public retryable = true,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}

/**
 * Minimal SSE reader shared by the fetch-based providers (OpenAI, Gemini).
 * Yields the `data:` payload of each event.
 */
export async function* readSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trimEnd();
        buffer = buffer.slice(idx + 1);
        if (line.startsWith("data:")) {
          yield line.slice(5).trimStart();
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
