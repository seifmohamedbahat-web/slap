import type { AiProvider, ProviderChatOptions } from "../types";
import { ProviderError, readSse } from "../types";

const API_URL = "https://api.openai.com/v1/chat/completions";

export const openaiProvider: AiProvider = {
  id: "openai",
  models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3-mini"],

  async chat(opts: ProviderChatOptions): Promise<string> {
    const res = await fetch(API_URL, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        stream: true,
        messages: [
          { role: "system", content: opts.system },
          ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new ProviderError(
        "openai",
        `HTTP ${res.status}: ${detail.slice(0, 300)}`,
        res.status === 429 || res.status >= 500,
      );
    }

    let full = "";
    for await (const data of readSse(res.body)) {
      if (data === "[DONE]") break;
      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          opts.onDelta(delta);
        }
      } catch {
        // Ignore malformed keep-alive chunks.
      }
    }
    return full;
  },
};
