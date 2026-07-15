import type { HealthInfo, ServerEvent, SystemStats } from "./types";

export const API_BASE = "http://127.0.0.1:8765/api";

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`health ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<SystemStats> {
  const res = await fetch(`${API_BASE}/system/stats`);
  if (!res.ok) throw new Error(`stats ${res.status}`);
  return res.json();
}

export async function resetConversation(): Promise<void> {
  await fetch(`${API_BASE}/conversation/reset`, { method: "POST" });
}

/**
 * POST /api/chat and stream SSE events. EventSource can't POST, so we parse
 * the text/event-stream body off a fetch ReadableStream.
 */
export async function streamChat(
  message: string,
  onEvent: (event: ServerEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`chat failed (${res.status}) ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of rawEvent.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          onEvent(JSON.parse(line.slice(6)) as ServerEvent);
        } catch {
          // ignore malformed frames
        }
      }
    }
  }
}
