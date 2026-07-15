import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, ProviderChatOptions } from "../types";
import { ProviderError } from "../types";

export const claudeProvider: AiProvider = {
  id: "claude",
  models: ["claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5"],

  async chat(opts: ProviderChatOptions): Promise<string> {
    const client = new Anthropic({ apiKey: opts.apiKey });
    try {
      const stream = client.messages.stream(
        {
          model: opts.model,
          max_tokens: 16000,
          system: opts.system,
          messages: opts.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
        { signal: opts.signal },
      );
      stream.on("text", (delta) => opts.onDelta(delta));
      const final = await stream.finalMessage();
      return final.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
    } catch (err) {
      if (opts.signal.aborted) throw err;
      if (err instanceof Anthropic.RateLimitError) {
        throw new ProviderError("claude", "rate limited", true);
      }
      if (err instanceof Anthropic.APIError) {
        throw new ProviderError(
          "claude",
          `HTTP ${err.status}: ${err.message}`,
          (err.status ?? 500) >= 500,
        );
      }
      throw new ProviderError("claude", String(err), true);
    }
  },
};
