import Link from "next/link";
import clsx from "clsx";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={clsx("font-extrabold tracking-tight text-xl select-none", className)}
    >
      AVE<span className="text-avexa-accent">X</span>A
    </Link>
  );
}
