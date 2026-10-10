import { ReactNode } from "react";
import { Icon } from "./Icon";
import { LogoMark, Wordmark } from "./Logo";
import ThemeToggle from "./ThemeToggle";

/** Sign-in pages: a frosted Mac window; black hero with a purple glow on the left, the form on the right. */
export default function AuthFrame({ heading, intro, children }: { heading: string; intro: string; children: ReactNode }) {
  return (
    <main className="desk relative flex min-h-screen items-center justify-center overflow-hidden p-4 text-[var(--fg)]">
      <div className="animate-drift pointer-events-none absolute -left-32 top-0 h-[460px] w-[460px] rounded-full bg-[#c4b5fd] opacity-40 blur-[120px] dark:opacity-20" />

      <div className="mac-window animate-window relative w-full max-w-[1000px] overflow-hidden rounded-[16px]">
        <header className="mac-titlebar flex items-center gap-2 px-4 py-2.5">
          <div className="mac-lights" aria-hidden="true">
            <span className="mac-light close" />
            <span className="mac-light min" />
            <span className="mac-light max" />
          </div>
          <span className="flex flex-1 items-center justify-center gap-1.5 text-[13px] font-medium text-[var(--fg-2)]">
            <LogoMark size={16} />
            HireFlow AI
          </span>
          <ThemeToggle />
        </header>

        <div className="grid md:grid-cols-[1.05fr_1fr]">
          <section className="hero-dark relative hidden flex-col justify-between overflow-hidden p-9 md:flex">
            <div>
              <Wordmark size={32} tagline />
              <h1 className="mt-8 font-display text-[34px] font-semibold leading-[1.1] tracking-tight">
                {heading.split(" ").slice(0, -1).join(" ")} <span className="text-gradient">{heading.split(" ").slice(-1)}</span>
              </h1>
              <p className="mt-3 max-w-[380px] text-[15px] leading-relaxed text-[var(--fg-2)]">{intro}</p>
            </div>

            {/* A peek at the product, as floating glass cards */}
            <div className="relative mt-10 h-[230px]">
              <div className="mac-glass animate-float absolute left-0 top-0 w-[250px] p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--fg-2)]">
                  <Icon name="sparkle" size={12} className="text-[#c4b5fd]" /> AI resume match
                </p>
                <p className="mt-1 text-[14px] font-semibold">Fatima Ali · Backend Engineer</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[91%] rounded-full" style={{ background: "var(--accent-gradient)" }} />
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums">91</span>
                </div>
              </div>
              <div className="mac-glass animate-float absolute right-0 top-[86px] w-[220px] p-4" style={{ animationDelay: "-2s" }}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3ecf8e]/20 text-[#3ecf8e]">
                    <Icon name="check" size={15} />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold">Leave approved</p>
                    <p className="text-[11px] text-[var(--fg-2)]">Priya · 2 days casual</p>
                  </div>
                </div>
              </div>
              <div className="mac-glass animate-float absolute bottom-0 left-8 w-[200px] p-4" style={{ animationDelay: "-4s" }}>
                <p className="text-[11px] font-semibold text-[var(--fg-2)]">October payroll</p>
                <p className="mt-0.5 font-display text-[22px] font-semibold">₹14.2L</p>
                <p className="text-[11px] text-[#c4b5fd]">12 payslips processed</p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-[360px]">
              <div className="mb-8 md:hidden">
                <Wordmark size={28} tagline />
              </div>
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
