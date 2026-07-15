import { useState } from "react";

export default function InputBar({
  onSend,
  onReset,
  busy,
}: {
  onSend: (text: string) => void;
  onReset: () => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setText("");
    onSend(trimmed);
  };

  return (
    <div className="border-t border-hud-line px-4 py-3 flex items-end gap-2">
      <button
        disabled
        title="Voice input arrives in Phase 2"
        className="h-9 w-9 shrink-0 rounded-full border border-hud-line text-hud-dim/50 cursor-not-allowed"
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
