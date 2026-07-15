import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import BookingForm from "./BookingForm";

const PERKS = [
  { icon: "compass", text: "Honest advice on what your business actually needs" },
  { icon: "tag", text: "A ballpark quote and timeline on the spot" },
  { icon: "rocket", text: "A clear action plan — whether you work with us or not" },
];

export default function BookingSection({ serviceOptions }: { serviceOptions: string[] }) {
  return (
    <section id="book" className="relative overflow-hidden bg-ink py-20 text-white sm:py-28" aria-label="Book a call">
      {/* orbit backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 right-[10%] h-[380px] w-[380px] rounded-full bg-brand/25 blur-[120px]" />
        <div className="absolute -bottom-24 left-[5%] h-[300px] w-[300px] rounded-full bg-accent/15 blur-[100px]" />
        <div className="absolute -top-20 -left-24 h-72 w-72 rounded-full border border-white/8" />
        <div className="absolute -right-16 -bottom-24 h-80 w-80 rounded-full border border-white/8" />
        <div className="absolute top-[20%] left-[42%] h-1.5 w-1.5 rounded-full bg-accent/80" />
        <div className="absolute bottom-[18%] right-[38%] h-1 w-1 rounded-full bg-white/50" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:px-8">
        <Reveal>
          <p className="text-xs font-bold tracking-[0.22em] text-accent uppercase">Book an appointment</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Grab a free strategy call with our team
          </h2>
          <p className="mt-4 leading-relaxed text-white/65">
            Pick a day and time that suits you and we&apos;ll call you — a relaxed 15–30 minute chat
            about your goals, no sales pressure. Your booking lands straight in our mission control,
            and we confirm by email.
          </p>
          <ul className="mt-8 space-y-4">
            {PERKS.map((perk) => (
              <li key={perk.text} className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent">
                  <Icon name={perk.icon} size={18} />
                </span>
                <span className="text-sm font-medium text-white/85">{perk.text}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={150}>
          <BookingForm serviceOptions={serviceOptions} />
        </Reveal>
      </div>
    </section>
  );
}
