import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";

export default function CtaBanner() {
  return (
    <section className="bg-mist px-5 pb-20 sm:pb-28 lg:px-8" aria-label="Call to action">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center sm:px-14 sm:py-20">
          {/* orbit decorations */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-24 left-1/2 h-[340px] w-[560px] -translate-x-1/2 rounded-full bg-brand/30 blur-[110px]" />
            <div className="absolute -right-20 -bottom-24 h-[240px] w-[240px] rounded-full bg-accent/20 blur-[90px]" />
            <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full border border-white/10" />
            <div className="absolute -right-12 -bottom-20 h-64 w-64 rounded-full border border-white/10" />
            <div className="absolute top-[18%] right-[16%] h-1.5 w-1.5 rounded-full bg-accent" />
            <div className="absolute bottom-[22%] left-[12%] h-1 w-1 rounded-full bg-white/60" />
          </div>

          <div className="relative">
            <h2 className="font-display mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to launch your business online?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Tell us about your project and get a free, no-pressure quote within 24 hours. The
              countdown starts whenever you are.
            </p>
            <a href="#contact" className="btn-primary mt-9">
              Start Your Project
              <Icon name="rocket" size={16} />
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
