"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { THEME_KEY } from "@/lib/theme";

/** Sun / moon switch styled like a macOS segmented control. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const set = (next: boolean) => {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Storage blocked: the choice just won't persist.
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`relative flex items-center rounded-full border border-[var(--line-strong)] bg-[var(--card-soft)] p-0.5 ${className}`}
    >
      <span
        className="absolute top-0.5 h-[26px] w-[26px] rounded-full bg-[var(--card)] shadow-[var(--shadow-card)] transition-transform duration-300"
        style={{ transform: `translateX(${dark ? 26 : 0}px)` }}
        aria-hidden="true"
      />
      {[false, true].map((isDark) => (
        <button
          key={String(isDark)}
          role="radio"
          aria-checked={dark === isDark}
          title={isDark ? "Dark mode" : "Light mode"}
          onClick={() => set(isDark)}
          className={`relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full transition-colors ${
            dark === isDark ? "text-[var(--accent-strong)] dark:text-[var(--accent)]" : "text-[var(--fg-3)]"
          }`}
        >
          <Icon name={isDark ? "moon" : "sun"} size={14} />
        </button>
      ))}
    </div>
  );
}
