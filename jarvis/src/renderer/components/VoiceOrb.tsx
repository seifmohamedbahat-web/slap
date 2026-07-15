/**
 * The JARVIS voice orb — a HUD-style animated core with concentric rings and
 * a live waveform. `level` (0..1) drives the amplitude so the orb reacts to
 * mic input and speech playback.
 */
import { cx } from "./ui";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export function VoiceOrb({
  state,
  level = 0,
  size = 220,
}: {
  state: VoiceState;
  level?: number;
  size?: number;
}) {
  const active = state === "listening" || state === "speaking";
  const amp = Math.max(0.05, Math.min(1, level));
  const bars = 40;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* outer glow rings */}
      <div
        className={cx(
          "absolute inset-0 rounded-full border transition-all duration-500",
          active ? "border-neon-400/40" : "border-white/8",
        )}
        style={{ boxShadow: active ? `0 0 ${40 + amp * 60}px rgba(56,189,248,${0.25 + amp * 0.35})` : "none" }}
      />
      <div
        className={cx(
          "absolute rounded-full border transition-all",
          active ? "border-neon-400/25 animate-spin-slow" : "border-white/6",
        )}
        style={{ inset: size * 0.12 }}
      />
      <div
        className={cx("absolute rounded-full", state === "thinking" && "animate-pulse-slow")}
        style={{ inset: size * 0.22 }}
      />

      {/* core */}
      <div
        className={cx(
          "relative flex items-center justify-center rounded-full",
          active ? "animate-orb-breathe" : "",
        )}
        style={{
          width: size * 0.56,
          height: size * 0.56,
          background:
            "radial-gradient(circle at 50% 35%, rgba(125,211,252,0.9), rgba(14,165,233,0.5) 45%, rgba(2,132,199,0.15) 75%)",
          boxShadow: `inset 0 0 40px rgba(2,132,199,0.4), 0 0 ${30 + amp * 40}px rgba(56,189,248,${0.3 + amp * 0.3})`,
        }}
      >
        {/* live waveform */}
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 100 100" className="opacity-90">
          <g>
            {Array.from({ length: bars }).map((_, i) => {
              const angle = (i / bars) * Math.PI * 2;
              const phase = state === "speaking" ? Math.sin(i * 0.6 + Date.now() / 120) : Math.sin(i * 0.9);
              const len = active ? 6 + Math.abs(phase) * amp * 20 : 4;
              const x1 = 50 + Math.cos(angle) * 26;
              const y1 = 50 + Math.sin(angle) * 26;
              const x2 = 50 + Math.cos(angle) * (26 + len);
              const y2 = 50 + Math.sin(angle) * (26 + len);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
