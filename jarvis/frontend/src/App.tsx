import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHealth, resetConversation, streamChat } from "./api";
import InputBar from "./components/InputBar";
import Orb from "./components/Orb";
import Sidebar from "./components/Sidebar";
import SystemStats from "./components/SystemStats";
import Transcript from "./components/Transcript";
import type { ChatMessage, OrbState, ServerEvent, VoiceEvent } from "./types";
import { connectVoice, playClip, pushToTalk, toggleVoice } from "./voice";

let nextId = 0;
const uid = () => `m${++nextId}`;

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    fetchHealth()
      .then((health) => {
        if (!health.api_key_configured) {
          setBanner(
            "No Anthropic API key configured — copy jarvis/.env.example to jarvis/backend/.env and add ANTHROPIC_API_KEY.",
          );
        }
      })
      .catch(() =>
        setBanner(
          "Backend not reachable at 127.0.0.1:8765 — start it from jarvis/backend (see README).",
        ),
      );
  }, []);

  const applyEvent = useCallback((event: ServerEvent) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (!last || last.role !== "assistant") return next;
      const updated: ChatMessage = { ...last, toolCalls: [...last.toolCalls] };

      switch (event.type) {
        case "text_delta":
          updated.text += event.text;
          break;
        case "tool_use":
          updated.toolCalls.push({
            id: event.id,
            name: event.name,
            input: event.input,
          });
          break;
        case "tool_result": {
          const idx = updated.toolCalls.findIndex((c) => c.id === event.tool_use_id);
          if (idx !== -1) {
            updated.toolCalls[idx] = {
              ...updated.toolCalls[idx],
              resultPreview: event.preview,
              isError: event.is_error,
            };
          }
          break;
        }
        case "error":
          updated.error = event.message;
          break;
        default:
          return next;
      }
      next[next.length - 1] = updated;
      return next;
    });

    if (event.type === "state") setOrbState(event.state);
  }, []);

  // ---- voice pipeline (WebSocket) ----------------------------------------
  useEffect(() => {
    const disconnect = connectVoice((event: VoiceEvent) => {
      switch (event.type) {
        case "voice_status":
          setVoiceAvailable(event.available);
          setVoiceEnabled(event.enabled);
          break;
        case "voice_state":
          if (event.state === "listening") setOrbState("listening");
          else if (event.state === "transcribing") setOrbState("thinking");
          else if (event.state === "speaking") setOrbState("speaking");
          else if (!busyRef.current) setOrbState("idle");
          break;
        case "voice_transcript":
          setBusy(true);
          setOrbState("thinking");
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "user", text: event.text, toolCalls: [] },
            { id: uid(), role: "assistant", text: "", toolCalls: [] },
          ]);
          break;
        case "speak":
          setOrbState("speaking");
          playClip(event.audio_id).then(() => setOrbState("idle"));
          break;
        case "turn_done":
          setBusy(false);
          break;
        default:
          applyEvent(event);
      }
    });
    return disconnect;
  }, [applyEvent]);

  // In-app push-to-talk (Ctrl+Shift+J) — the backend also registers a
  // global hotkey so this works while the window is hidden in the tray.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        pushToTalk().catch(() => undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (busyRef.current) return;
      setBusy(true);
      setOrbState("thinking");
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", text, toolCalls: [] },
        { id: uid(), role: "assistant", text: "", toolCalls: [] },
      ]);
      abortRef.current = new AbortController();
      try {
        await streamChat(text, applyEvent, abortRef.current.signal);
      } catch (err) {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              error: err instanceof Error ? err.message : String(err),
            };
          }
          return next;
        });
      } finally {
        setBusy(false);
        setOrbState("idle");
      }
    },
    [applyEvent],
  );

  const reset = useCallback(async () => {
    await resetConversation().catch(() => undefined);
    setMessages([]);
    setOrbState("idle");
  }, []);

  const onToggleVoice = useCallback(() => {
    const next = !voiceEnabled;
    setVoiceEnabled(next); // optimistic; voice_status will confirm
    toggleVoice(next).catch(() => setVoiceEnabled(!next));
  }, [voiceEnabled]);

  return (
    <div className="h-full flex flex-col">
      {banner && (
        <div className="bg-hud-warn/15 border-b border-hud-warn/40 text-hud-warn text-xs px-4 py-2">
          {banner}
        </div>
      )}
      <div className="flex-1 flex min-h-0">
        <Sidebar onAction={send} busy={busy} />
        <main className="flex-1 flex flex-col min-w-0">
          <Orb state={orbState} />
          <Transcript messages={messages} streaming={busy} />
          <InputBar
            onSend={send}
            onReset={reset}
            busy={busy}
            voiceAvailable={voiceAvailable}
            voiceEnabled={voiceEnabled}
            onToggleVoice={onToggleVoice}
          />
        </main>
        <SystemStats />
      </div>
    </div>
  );
}
