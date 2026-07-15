import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import ToolCallCard from "./ToolCallCard";

export default function Transcript({
  messages,
  streaming,
}: {
  messages: ChatMessage[];
  streaming: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="h-full flex items-center justify-center text-hud-dim text-sm">
          Ask Jarvis about your files — try a quick action on the left.
        </div>
      )}
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isLast = index === messages.length - 1;
        return (
          <div key={message.id} className={isUser ? "flex justify-end" : ""}>
            <div
              className={
                "max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed selectable " +
                (isUser
                  ? "bg-hud-accent-soft border border-hud-accent/30"
                  : "bg-hud-panel border border-hud-line")
              }
            >
              {!isUser && (
                <div className="text-[10px] uppercase tracking-[0.2em] text-hud-dim mb-1">
                  Jarvis
                </div>
              )}
              {message.toolCalls.map((call) => (
                <ToolCallCard key={call.id} call={call} />
              ))}
              <div
                className={
                  "whitespace-pre-wrap " +
                  (!isUser && isLast && streaming && message.text ? "caret" : "")
                }
              >
                {message.text ||
                  (!isUser && isLast && streaming && message.toolCalls.length === 0
                    ? "…"
                    : "")}
              </div>
              {message.error && (
                <div className="mt-2 text-xs text-hud-error border border-hud-error/40 rounded-md px-2 py-1">
                  {message.error}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
