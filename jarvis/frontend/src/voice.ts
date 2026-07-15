import { API_BASE } from "./api";
import type { VoiceEvent } from "./types";

const WS_URL = API_BASE.replace(/^http/, "ws") + "/voice/ws";

/**
 * Connect to the voice WebSocket with automatic reconnect.
 * Returns a cleanup function.
 */
export function connectVoice(onEvent: (event: VoiceEvent) => void): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    if (closed) return;
    socket = new WebSocket(WS_URL);
    socket.onmessage = (message) => {
      try {
        onEvent(JSON.parse(message.data) as VoiceEvent);
      } catch {
        // ignore malformed frames
      }
    };
    socket.onclose = () => {
      if (!closed) retry = setTimeout(open, 3000);
    };
    socket.onerror = () => socket?.close();
  };
  open();

  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    socket?.close();
  };
}

export async function toggleVoice(enabled: boolean): Promise<void> {
  await fetch(`${API_BASE}/voice/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
}

export async function pushToTalk(): Promise<void> {
  await fetch(`${API_BASE}/voice/ptt`, { method: "POST" });
}

/** Play a synthesized TTS clip; resolves when playback finishes. */
export function playClip(audioId: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(`${API_BASE}/voice/audio/${audioId}`);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}
