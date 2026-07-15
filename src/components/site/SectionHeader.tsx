import Reveal from "@/components/Reveal";

export default function SectionHeader({
  eyebrow,
  title,
  sub,
  on = "light",
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
  on?: "light" | "dark";
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold tracking-[0.22em] text-brand uppercase">{eyebrow}</p>
      <h2
        className={`font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${
          on === "dark" ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {sub && (
        <p className={`mt-4 text-base leading-relaxed ${on === "dark" ? "text-white/65" : "text-ink-soft"}`}>
          {sub}
        </p>
      )}
    </Reveal>
  );
}
