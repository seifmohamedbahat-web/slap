import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { login } from "../actions";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/admin");

  const { error, next } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-5">
      {/* orbit backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-brand/25 blur-[130px]" />
        <div className="absolute -bottom-24 -left-16 h-[300px] w-[300px] rounded-full bg-accent/15 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex justify-center">
          <Logo on="dark" tagline size={44} href={null} />
        </div>

        <form
          action={login}
          className="mt-8 rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl"
        >
          <h1 className="font-display text-xl font-semibold text-white">Mission control login</h1>
          <p className="mt-1 text-sm text-white/55">Sign in to manage the DigitalOrbit site.</p>

          {error && (
            <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-200" role="alert">
              Invalid email or password. Please try again.
            </p>
          )}

          {next && <input type="hidden" name="next" value={next} />}

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold tracking-wide text-white/60 uppercase">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@digitalorbit.agency"
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 transition focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold tracking-wide text-white/60 uppercase">
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 transition focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary mt-7 w-full">
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          Protected area — authorized DigitalOrbit team members only.
        </p>
      </div>
    </main>
  );
}
