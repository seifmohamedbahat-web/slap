import Link from "next/link";

/**
 * DigitalOrbit logo: planet + orbit rings mark, wordmark, optional tagline.
 * `on="dark"` renders the wordmark for dark backgrounds (footer, admin sidebar).
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lg-planet" x1="14" y1="16" x2="50" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#6D5EF2" />
        </linearGradient>
        <linearGradient id="lg-ring" x1="4" y1="20" x2="60" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6D5EF2" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      {/* outer faint ring */}
      <ellipse cx="32" cy="32" rx="27" ry="27" stroke="#6D5EF2" strokeOpacity="0.18" strokeWidth="2" />
      {/* planet */}
      <circle cx="32" cy="32" r="14" fill="url(#lg-planet)" />
      <circle cx="27" cy="27" r="4.5" fill="#fff" fillOpacity="0.35" />
      {/* tilted orbit ring */}
      <g transform="rotate(-20 32 32)">
        <ellipse cx="32" cy="32" rx="26" ry="10.5" stroke="url(#lg-ring)" strokeWidth="3" />
        <circle cx="52" cy="24.5" r="3.4" fill="#22D3EE" />
        <circle cx="9" cy="38" r="2.4" fill="#6D5EF2" />
      </g>
    </svg>
  );
}

export default function Logo({
  on = "light",
  tagline = false,
  size = 40,
  href = "/",
}: {
  on?: "light" | "dark";
  tagline?: boolean;
  size?: number;
  href?: string | null;
}) {
  const wordmark = (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-xl font-bold tracking-tight ${
            on === "dark" ? "text-white" : "text-ink"
          }`}
        >
          Digital<span className="text-brand">Orbit</span>
        </span>
        {tagline && (
          <span
            className={`mt-1 text-[0.55rem] font-medium uppercase tracking-[0.28em] ${
              on === "dark" ? "text-white/50" : "text-ink/50"
            }`}
          >
            Websites &amp; Digital Services
          </span>
        )}
      </span>
    </span>
  );

  if (!href) return wordmark;
  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="DigitalOrbit — home">
      {wordmark}
    </Link>
  );
}
