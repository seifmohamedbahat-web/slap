import { useState } from "react";

export default function InputBar({
  onSend,
  onReset,
  busy,
  voiceAvailable,
  voiceEnabled,
  onToggleVoice,
}: {
  onSend: (text: string) => void;
  onReset: () => void;
  busy: boolean;
  voiceAvailable: boolean;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setText("");
    onSend(trimmed);
  };

  const micTitle = !voiceAvailable
    ? "Voice unavailable — install the voice extras (see README)"
    : voiceEnabled
      ? 'Listening for "hey Jarvis" — click to mute. Push-to-talk: Ctrl+Shift+J'
      : "Click to start wake-word listening";

  return (
    <div className="border-t border-hud-line px-4 py-3 flex items-end gap-2">
      <button
        disabled={!voiceAvailable}
        onClick={onToggleVoice}
        title={micTitle}
        className={
          "h-9 w-9 shrink-0 rounded-full border transition-colors " +
          (!voiceAvailable
            ? "border-hud-line text-hud-dim/50 cursor-not-allowed"
            : voiceEnabled
              ? "border-hud-accent bg-hud-accent-soft text-hud-accent"
              : "border-hud-line text-hud-dim hover:text-hud-text")
        }
      >
        🎙
      </button>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder={busy ? "Jarvis is working…" : "Type a request… (Enter to send)"}
        className="flex-1 resize-none rounded-lg bg-hud-panel border border-hud-line px-3 py-2 text-sm outline-none focus:border-hud-accent selectable"
      />
      <button
        onClick={submit}
        disabled={busy || !text.trim()}
        className="h-9 px-4 shrink-0 rounded-lg bg-hud-accent-soft border border-hud-accent/40 text-hud-accent text-sm disabled:opacity-40"
      >
        Send
      </button>
      <button
        onClick={onReset}
        disabled={busy}
        title="Clear the conversation"
        className="h-9 w-9 shrink-0 rounded-full border border-hud-line text-hud-dim hover:text-hud-text disabled:opacity-40"
      >
        ↺
      </button>
      <button
        disabled
        title="Settings arrive with the permission tiers in Phase 3"
        className="h-9 w-9 shrink-0 rounded-full border border-hud-line text-hud-dim/50 cursor-not-allowed"
      >
        ⚙
      </button>
    </div>
  );
}
