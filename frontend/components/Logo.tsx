"use client";

import { useId } from "react";

/**
 * HireFlow's mark: a macOS-style app icon. Two bars form an "H"; the crossbar is a light-purple curve
 * rising from left to right (people moving forward), with a small AI spark in the corner.
 * The tile is black on light backgrounds and white on dark ones (theme tokens --logo-tile / --logo-ink).
 * `animated` grows the bars, draws the curve and pops the spark.
 */
export function LogoMark({ size = 40, animated = false, className = "" }: { size?: number; animated?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`shrink-0 ${className}`} role="img" aria-label="HireFlow AI">
      <defs>
        <linearGradient id={`lav-${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ddd6fe" />
          <stop offset="0.5" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id={`gloss-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="var(--logo-tile)" />
      <rect width="64" height="64" rx="16" fill={`url(#gloss-${id})`} />
      <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" fill="none" stroke="#a78bfa" strokeOpacity="0.35" />
      <rect x="15" y="16" width="9" height="32" rx="4.5" fill="var(--logo-ink)" className={animated ? "logo-bar" : undefined} />
      <rect
        x="40"
        y="16"
        width="9"
        height="32"
        rx="4.5"
        fill="var(--logo-ink)"
        className={animated ? "logo-bar" : undefined}
        style={animated ? { animationDelay: "0.12s" } : undefined}
      />
      <path
        d="M24 32 C 28.5 26, 35.5 38, 40 32"
        fill="none"
        stroke={`url(#lav-${id})`}
        strokeWidth="6.5"
        strokeLinecap="round"
        className={animated ? "logo-flow" : undefined}
      />
      <path
        d="M54 5 L55.6 9.4 L60 11 L55.6 12.6 L54 17 L52.4 12.6 L48 11 L52.4 9.4 Z"
        fill={`url(#lav-${id})`}
        className={animated ? "logo-spark" : undefined}
      />
    </svg>
  );
}

/** Mark + "HireFlow" wordmark ("Flow" in purple), optionally with an "AI" badge. */
export function Wordmark({ size = 28, tagline = false, className = "" }: { size?: number; tagline?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: size * 0.38 }}>
      <LogoMark size={size} />
      <span className="font-display font-semibold leading-none tracking-tight" style={{ fontSize: size * 0.82 }}>
        Hire<span style={{ color: "var(--logo-flow-text)" }}>Flow</span>
      </span>
      {tagline && (
        <span
          className="rounded-full px-1.5 py-0.5 font-semibold leading-none"
          style={{ fontSize: Math.max(9, size * 0.32), background: "var(--accent-soft)", color: "var(--logo-flow-text)" }}
        >
          AI
        </span>
      )}
    </span>
  );
}
