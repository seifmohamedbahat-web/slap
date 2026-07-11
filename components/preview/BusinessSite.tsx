import Link from "next/link";
import type { WebsiteSectionData } from "@/lib/preview";
import { PAGE_ORDER } from "@/lib/preview";

function Section({ section, accent }: { section: WebsiteSectionData; accent: string }) {
  switch (section.type) {
    case "hero":
      return (
        <section className="px-6 py-24 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            {section.heading}
          </h1>
          {section.body && (
            <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-600">{section.body}</p>
          )}
          <a
            href="#contact"
            className="mt-8 inline-block rounded-full px-7 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Get In Touch
          </a>
        </section>
      );
    case "cta":
      return (
        <section className="px-6 py-16 text-center" style={{ backgroundColor: `${accent}10` }}>
          <h2 className="text-2xl font-bold">{section.heading}</h2>
          {section.body && <p className="mt-2 text-neutral-600">{section.body}</p>}
        </section>
      );
    case "services":
      return (
        <section className="px-6 py-20">
          <h2 className="mb-10 text-center text-3xl font-bold">{section.heading}</h2>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
            {section.items?.map((item) => (
              <div key={item.title} className="rounded-xl border border-neutral-200 p-6">
                <h3 className="font-semibold" style={{ color: accent }}>
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      );
    case "faq":
      return (
        <section className="px-6 py-20">
          <h2 className="mb-10 text-center text-3xl font-bold">{section.heading}</h2>
          <div className="mx-auto max-w-2xl space-y-4">
            {section.items?.map((item) => (
              <div key={item.title} className="rounded-xl border border-neutral-200 p-5">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm text-neutral-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      );
    case "gallery":
      return (
        <section className="px-6 py-20">
          <h2 className="mb-10 text-center text-3xl font-bold">{section.heading}</h2>
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-neutral-100" />
            ))}
          </div>
        </section>
      );
    case "testimonials":
      return (
        <section className="px-6 py-20 text-center">
          <h2 className="text-3xl font-bold">{section.heading}</h2>
          {section.body && <p className="mt-3 text-lg text-neutral-600">{section.body}</p>}
        </section>
      );
    case "contact":
      return (
        <section id="contact" className="px-6 py-20">
          <h2 className="mb-6 text-center text-3xl font-bold">{section.heading}</h2>
          {section.body && (
            <p className="mx-auto max-w-md text-center text-neutral-600">{section.body}</p>
          )}
          <form className="mx-auto mt-8 max-w-md space-y-4">
            <input
              className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 outline-none"
              placeholder="Your name"
            />
            <input
              className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 outline-none"
              placeholder="Email"
            />
            <textarea
              rows={4}
              className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 outline-none"
              placeholder="Message"
            />
            <button
              type="button"
              className="w-full rounded-full py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Send Message
            </button>
          </form>
        </section>
      );
    default:
      return (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold">{section.heading}</h2>
            {section.body && <p className="mt-4 text-neutral-600">{section.body}</p>}
          </div>
        </section>
      );
  }
}

export function BusinessSite({
  businessName,
  slug,
  currentPage,
  page,
  accent,
}: {
  businessName: string;
  slug: string;
  currentPage: string;
  page: { title: string; sections: WebsiteSectionData[] };
  accent: string;
}) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-8 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-bold">{businessName}</span>
          <div className="hidden gap-6 text-sm sm:flex">
            {PAGE_ORDER.map(([key, label]) => (
              <Link
                key={key}
                href={key === "home" ? `/preview/${slug}` : `/preview/${slug}/${key}`}
                className={currentPage === key ? "font-semibold" : "text-neutral-500 hover:text-neutral-900"}
                style={currentPage === key ? { color: accent } : undefined}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main>
        {page.sections.map((section, i) => (
          <Section key={i} section={section} accent={accent} />
        ))}
      </main>
      <footer className="border-t border-neutral-200 px-6 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {businessName}. Website by AVEXA.
      </footer>
    </div>
  );
}
