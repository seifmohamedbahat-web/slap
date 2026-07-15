/**
 * Dashboard data-visualization primitives, built as inline SVG per the dataviz
 * method: single-series sparklines (no legend; the tile title names the metric),
 * radial gauges whose fill carries severity, and stat tiles.
 *
 * Palette roles (validated for the dark surface #0a0f1e):
 *   accent  #38bdf8   good #0ca30c   warning #fab219   critical #d03b3b
 * Marks are thin (2px lines), the current point is an 8px marker with a
 * surface ring, and text always wears ink tokens — never the series color.
 */
import { useId } from "react";
import { cx } from "./ui";
import { Icon, type IconName } from "./Icon";

const ACCENT = "#38bdf8";

function severityColor(pct: number): string {
  if (pct >= 90) return "#d03b3b"; // critical
  if (pct >= 75) return "#fab219"; // warning
  return ACCENT;
}

/**
 * A single-series area+line sparkline. Values are 0..1 or arbitrary; pass
 * `max` to fix the scale (e.g. 100 for a percentage) so the baseline is stable.
 */
export function Sparkline({
  values,
  max,
  color = ACCENT,
  height = 44,
  width = 160,
  className,
}: {
  values: number[];
  max?: number;
  color?: string;
  height?: number;
  width?: number;
  className?: string;
}) {
  const gradientId = useId();
  const pad = 3;
  const w = width;
  const h = height;
  const domainMax = max ?? Math.max(1, ...values);
  const n = values.length;

  if (n === 0) {
    return <svg width={w} height={h} className={className} aria-hidden="true" />;
  }

  const x = (i: number) => (n === 1 ? w - pad : pad + (i / (n - 1)) * (w - pad * 2));
  const y = (v: number) => h - pad - (Math.min(v, domainMax) / domainMax) * (h - pad * 2);

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${h - pad} L${x(0).toFixed(1)},${h - pad} Z`;
  const lastX = x(n - 1);
  const lastY = y(values[n - 1]);

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label={`Trend, latest value ${values[n - 1].toFixed(0)}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* current point: 8px marker with a 2px surface ring */}
      <circle cx={lastX} cy={lastY} r={4} fill={color} stroke="#0a0f1e" strokeWidth={2} />
    </svg>
  );
}

/** A 270° radial gauge whose arc color escalates with severity. */
export function Gauge({
  value,
  label,
  sublabel,
  size = 132,
}: {
  value: number; // 0..100
  label: string;
  sublabel?: string;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 9;
  const r = (size - stroke) / 2;
  const cx0 = size / 2;
  const cy0 = size / 2;
  const startAngle = 135;
  const sweep = 270;
  const circumference = 2 * Math.PI * r;
  const arcFraction = sweep / 360;
  const dash = circumference * arcFraction;
  const filled = dash * (pct / 100);
  const color = severityColor(pct);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${pct.toFixed(0)} percent`}>
        {/* track: lighter step of the same ramp so state reads across the arc */}
        <circle
          cx={cx0}
          cy={cy0}
          r={r}
          fill="none"
          stroke="rgba(148,178,232,0.12)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(${startAngle} ${cx0} ${cy0})`}
        />
        <circle
          cx={cx0}
          cy={cy0}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(${startAngle} ${cx0} ${cy0})`}
          style={{ transition: "stroke-dasharray 500ms cubic-bezier(0.16,1,0.3,1), stroke 300ms" }}
        />
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-ink-primary"
          style={{ fontSize: size * 0.24, fontWeight: 600 }}
        >
          {pct.toFixed(0)}
          <tspan style={{ fontSize: size * 0.12 }} className="fill-ink-muted">
            %
          </tspan>
        </text>
        <text
          x="50%"
          y="63%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-ink-muted"
          style={{ fontSize: size * 0.1, textTransform: "uppercase", letterSpacing: 1 }}
        >
          {label}
        </text>
      </svg>
      {sublabel && <p className="-mt-1 text-xs text-ink-muted">{sublabel}</p>}
    </div>
  );
}

/** Linear meter: fill carries severity, track is a lighter step of the ramp. */
export function Meter({ value, label, valueText }: { value: number; label: string; valueText?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = severityColor(pct);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-ink-secondary">{label}</span>
        <span className="tabular-nums text-ink-primary">{valueText ?? `${pct.toFixed(0)}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            transition: "width 500ms cubic-bezier(0.16,1,0.3,1), background 300ms",
          }}
        />
      </div>
    </div>
  );
}

/** Stat tile: label · value · optional delta · optional sparkline. */
export function StatTile({
  label,
  value,
  icon,
  unit,
  delta,
  values,
  max,
}: {
  label: string;
  value: string;
  icon?: IconName;
  unit?: string;
  delta?: { text: string; good: boolean };
  values?: number[];
  max?: number;
}) {
  return (
    <div className="glass glass-hover rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
        {icon && <Icon name={icon} size={16} className="text-neon-400/80" />}
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        <span className="text-2xl font-semibold tracking-tight text-ink-primary">{value}</span>
        {unit && <span className="pb-0.5 text-sm text-ink-muted">{unit}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {delta ? (
          <span className={cx("text-xs font-medium", delta.good ? "text-status-good" : "text-status-critical")}>
            {delta.text}
          </span>
        ) : (
          <span />
        )}
        {values && values.length > 1 && <Sparkline values={values} max={max} width={72} height={26} />}
      </div>
    </div>
  );
}
