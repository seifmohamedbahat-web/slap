import type { OrbState } from "../types";

const LABELS: Record<OrbState, string> = {
  idle: "Idle",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Responding…",
  tool: "Working…",
};

export default function Orb({ state }: { state: OrbState }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className={`orb orb-${state}`} aria-label={`Jarvis is ${LABELS[state]}`} />
      <span className="text-xs tracking-[0.25em] uppercase text-hud-dim">
        {LABELS[state]}
      </span>
    </div>
  );
}
