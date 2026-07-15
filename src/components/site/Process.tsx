import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import SectionHeader from "./SectionHeader";

const STEPS = [
  {
    icon: "compass",
    title: "Discover",
    text: "We learn your business, your customers, and your goals in a free strategy call.",
  },
  {
    icon: "layout",
    title: "Design",
    text: "You get modern mockups to react to — we refine until you love every pixel.",
  },
  {
    icon: "code",
    title: "Develop",
    text: "We build it fast, responsive, and SEO-ready, with progress you can click every week.",
  },
  {
    icon: "rocket",
    title: "Launch",
    text: "We go live, train your team, and stay in orbit for support and growth.",
  },
];

export default function Process() {
  return (
    <section id="process" className="bg-white py-20 sm:py-28" aria-label="Our process">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeader
          eyebrow="How it works"
          title="From first call to liftoff in four steps"
          sub="A simple, transparent process — you always know what's happening and what comes next."
        />

        <ol className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* connecting line (desktop) */}
          <div
            className="absolute top-7 right-[12%] left-[12%] hidden border-t-2 border-dashed border-brand/20 lg:block"
            aria-hidden="true"
          />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <Reveal delay={i * 120} className="flex flex-col items-center text-center">
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white shadow-lg shadow-brand/30">
                  <Icon name={step.icon} size={24} />
                  <span className="font-display absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[0.65rem] font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-display mt-5 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-ink-soft">{step.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
