import { useState } from "react";
import type { ToolCall } from "../types";

export default function ToolCallCard({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false);
  const pending = call.resultPreview === undefined;

  return (
    <div className="my-1.5 rounded-lg border border-hud-line bg-hud-panel text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span
          className={
            "h-1.5 w-1.5 rounded-full " +
            (pending
              ? "bg-hud-warn animate-pulse"
              : call.isError
                ? "bg-hud-error"
                : "bg-hud-accent")
          }
        />
        <span className="font-mono text-hud-accent">{call.name}</span>
        <span className="text-hud-dim">
          {pending ? "running…" : call.isError ? "failed" : "done"}
        </span>
        <span className="ml-auto text-hud-dim">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-hud-line px-3 py-2 space-y-2 selectable">
          <div>
            <div className="text-hud-dim mb-0.5">input</div>
            <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-hud-text/90">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          {call.resultPreview !== undefined && (
            <div>
              <div className="text-hud-dim mb-0.5">
                {call.isError ? "error" : "result (preview)"}
              </div>
              <pre
                className={
                  "whitespace-pre-wrap break-all font-mono text-[11px] " +
                  (call.isError ? "text-hud-error" : "text-hud-text/90")
                }
              >
                {call.resultPreview}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
