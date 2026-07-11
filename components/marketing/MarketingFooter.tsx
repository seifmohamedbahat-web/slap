import { Logo } from "@/components/ui/Logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-avexa-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-avexa-fg-muted">
            Premium Websites. Smart Systems. Real Growth.
          </p>
        </div>
        <p className="text-xs text-avexa-fg-muted">
          © {new Date().getFullYear()} AVEXA. Built for businesses that deserve to be found.
        </p>
      </div>
    </footer>
  );
}
