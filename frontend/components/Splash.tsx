"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";

const SHOW_MS = 2300;
const FADE_MS = 450;
const SEEN_KEY = "hireflow-splash-seen";

/**
 * Opening screen, once per browser session: the app icon bounces in like a macOS dock launch over
 * drifting purple light, the wordmark rises, and a thin loading bar fills. Click or press a key to skip.
 */
export default function Splash() {
  const [phase, setPhase] = useState<"show" | "leaving" | "gone">("show");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) {
        setPhase("gone");
        return;
      }
    } catch {
      // Storage blocked: just show it.
    }
    const leave = () => setPhase((p) => (p === "show" ? "leaving" : p));
    const timer = setTimeout(leave, SHOW_MS);
    window.addEventListener("keydown", leave);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", leave);
    };
  }, []);

  useEffect(() => {
    if (phase !== "leaving") return;
    // Marked only once it has played, so React's dev double-run of effects can't skip it.
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage blocked: it will show again next load.
    }
    const timer = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      className={`desk fixed inset-0 z-[100] flex cursor-default flex-col items-center justify-center overflow-hidden text-[var(--fg)] ${
        phase === "leaving" ? "splash-out" : ""
      }`}
      onClick={() => setPhase("leaving")}
      aria-hidden="true"
    >
      <div className="animate-drift pointer-events-none absolute -left-24 top-10 h-[420px] w-[420px] rounded-full bg-[#c4b5fd] opacity-40 blur-[110px] dark:opacity-25" />
      <div
        className="animate-drift pointer-events-none absolute -right-20 bottom-0 h-[480px] w-[480px] rounded-full bg-[#8b5cf6] opacity-30 blur-[120px] dark:opacity-35"
        style={{ animationDelay: "-6s" }}
      />

      <div className="splash-icon relative">
        <LogoMark size={112} animated className="drop-shadow-[0_24px_40px_rgba(124,58,237,0.35)]" />
        {/* Soft reflection, like an icon sitting on the Dock */}
        <div className="absolute -bottom-6 left-1/2 h-3 w-20 -translate-x-1/2 rounded-full bg-[#8b5cf6] opacity-25 blur-md" />
      </div>

      <h1 className="splash-rise mt-10 font-display text-[54px] font-semibold leading-none tracking-tight sm:text-[72px]" style={{ animationDelay: "0.55s" }}>
        Hire<span className="text-gradient">Flow</span>
        <span className="ml-2 align-top text-[16px] font-semibold text-[var(--logo-flow-text)] sm:text-[18px]">AI</span>
      </h1>
      <p className="splash-rise mt-3 text-[15px] text-[var(--fg-2)]" style={{ animationDelay: "0.75s" }}>
        People, hiring and payroll, in one calm place
      </p>

      <div className="splash-rise mt-10 h-1 w-48 overflow-hidden rounded-full bg-[var(--line-strong)]" style={{ animationDelay: "0.4s" }}>
        <div className="splash-load h-full w-full rounded-full" style={{ background: "var(--accent-gradient)" }} />
      </div>
    </div>
  );
}
