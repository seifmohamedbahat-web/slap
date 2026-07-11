/**
 * Thin wrapper around the Claude Messages API. When ANTHROPIC_API_KEY is not
 * configured, every function here falls back to deterministic template-based
 * output so the pipeline is fully exercisable without live credentials.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function askClaude(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  if (!hasAnthropicKey()) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: params.maxTokens ?? 2048,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const block = data.content?.find((c: { type: string }) => c.type === "text");
  return block?.text ?? "";
}

/** Extracts the first JSON object/array found in a Claude text response. */
export function extractJson<T>(text: string): T {
  const match = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const raw = match ? match[1] ?? match[0] : text;
  return JSON.parse(raw) as T;
}
