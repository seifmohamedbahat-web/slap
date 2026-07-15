import type { AiProvider, ProviderChatOptions } from "../types";
import { ProviderError, readSse } from "../types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const geminiProvider: AiProvider = {
  id: "gemini",
  models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],

  async chat(opts: ProviderChatOptions): Promise<string> {
    const url = `${BASE}/${encodeURIComponent(opts.model)}:streamGenerateContent?alt=sse`;
    const res = await fetch(url, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": opts.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new ProviderError(
        "gemini",
        `HTTP ${res.status}: ${detail.slice(0, 300)}`,
        res.status === 429 || res.status >= 500,
      );
    }

    let full = "";
    for await (const data of readSse(res.body)) {
      try {
        const parsed = JSON.parse(data) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const delta = parsed.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("");
        if (delta) {
          full += delta;
          opts.onDelta(delta);
        }
      } catch {
        // Ignore malformed chunks.
      }
    }
    return full;
  },
};
