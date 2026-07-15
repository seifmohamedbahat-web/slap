import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHealth, resetConversation, streamChat } from "./api";
import InputBar from "./components/InputBar";
import Orb from "./components/Orb";
import Sidebar from "./components/Sidebar";
import SystemStats from "./components/SystemStats";
import Transcript from "./components/Transcript";
import type { ChatMessage, OrbState, ServerEvent } from "./types";

let nextId = 0;
const uid = () => `m${++nextId}`;

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  const send = useCallback(
    async (text: string) => {
      if (busy) return;
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
    [busy, applyEvent],
  );

  const reset = useCallback(async () => {
    await resetConversation().catch(() => undefined);
    setMessages([]);
    setOrbState("idle");
  }, []);

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
          <InputBar onSend={send} onReset={reset} busy={busy} />
        </main>
        <SystemStats />
      </div>
    </div>
  );
}
