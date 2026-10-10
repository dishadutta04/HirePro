"use client";

import { InputHTMLAttributes, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./Icon";
import { LogoMark } from "./Logo";
import { initials, label, parseAi } from "@/lib/format";
import { fileUrl } from "@/lib/api";

/** White card with an optional small label header, as in Mitra's cards. */
export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mac-card p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <p className="mac-label">{title}</p>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[30px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-[var(--fg-2)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label: text, value, icon, hint }: { label: string; value: ReactNode; icon: IconName; hint?: string }) {
  return (
    <div className="mac-card flex items-start gap-3 p-4">
      <span className="mac-icon-tile h-10 w-10 shrink-0">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="mac-label">{text}</p>
        <p className="mt-0.5 font-display text-[26px] font-semibold tabular-nums leading-tight">{value}</p>
        {hint && <p className="text-[11px] text-[var(--fg-3)]">{hint}</p>}
      </div>
    </div>
  );
}

type Tone = "ok" | "warn" | "bad" | "accent" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-[color-mix(in_srgb,var(--ok)_14%,transparent)] text-[var(--ok)]",
  warn: "bg-[color-mix(in_srgb,var(--warn)_18%,transparent)] text-[#b7791f] dark:text-[var(--warn)]",
  bad: "bg-[color-mix(in_srgb,var(--bad)_14%,transparent)] text-[var(--bad)]",
  accent: "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]",
  neutral: "bg-[var(--card-soft)] text-[var(--fg-2)]",
};

const STATUS_TONE: Record<string, Tone> = {
  active: "ok", approved: "ok", completed: "ok", paid: "ok", present: "ok", hired: "ok", open: "ok",
  pending: "warn", in_progress: "warn", self_review: "warn", processed: "accent", draft: "neutral",
  interview: "accent", shortlisted: "accent", offered: "accent", screening: "warn", applied: "neutral",
  rejected: "bad", absent: "bad", inactive: "bad", closed: "neutral", on_hold: "warn", cancelled: "neutral",
  overdue: "bad", half_day: "warn", work_from_home: "accent", on_leave: "warn",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}>{children}</span>;
}

export const StatusBadge = ({ status }: { status: string }) => <Badge tone={STATUS_TONE[status] ?? "neutral"}>{label(status)}</Badge>;

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const src = fileUrl(url);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-[#1b0d3d]"
      style={{ width: size, height: size, fontSize: size * 0.36, background: "var(--accent-gradient)" }}
    >
      {initials(name)}
    </span>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  // Portalled to <body>: the frosted window's backdrop-filter would otherwise trap position:fixed inside it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c0b12]/30 p-0 backdrop-blur-[3px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`mac-window mac-sheet animate-window flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[16px] sm:rounded-[16px] ${wide ? "sm:max-w-[760px]" : "sm:max-w-[520px]"}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="mac-titlebar flex items-center gap-2 px-4 py-2.5">
          <div className="mac-lights">
            <button className="mac-light close" onClick={onClose} aria-label="Close" />
            <span className="mac-light min" aria-hidden="true" />
            <span className="mac-light max" aria-hidden="true" />
          </div>
          <span className="flex-1 truncate text-center text-[13px] font-medium text-[var(--fg-2)]">{title}</span>
          <span className="w-[52px]" />
        </header>
        <div className="scroll-quiet flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-[var(--line)] px-4 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * A labelled form field. Use `group` when the children are buttons (chips, rating pickers): a <label>
 * would otherwise lend its text to the first button and screen readers would announce the wrong name.
 */
export function Field({ label: text, children, hint, group = false }: { label: string; children: ReactNode; hint?: string; group?: boolean }) {
  const body = (
    <>
      <span className="mac-label">{text}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-[var(--fg-3)]">{hint}</span>}
    </>
  );
  return group ? (
    <div role="group" aria-label={text} className="block">
      {body}
    </div>
  ) : (
    <label className="block">{body}</label>
  );
}

/** Class for text inputs, selects and textareas. */
export const inputCls = "mac-input px-3 py-2 text-[14px]";

/** Password field with an eye button to show or hide what was typed. */
export function PasswordInput({
  className = "",
  containerClassName = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { containerClassName?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${containerClassName}`}>
      <input {...props} type={visible ? "text" : "password"} className={`${inputCls} !pr-11 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--fg-3)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
      >
        <Icon name={visible ? "eyeOff" : "eye"} size={16} />
      </button>
    </div>
  );
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[var(--fg-2)]">
      <LogoMark size={22} animated />
      {text}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mac-card flex items-center gap-3 p-4 text-[13px]" style={{ boxShadow: "0 0 0 1.5px var(--bad), var(--shadow-card)" }}>
      <Icon name="info" className="shrink-0 text-[var(--bad)]" />
      <p className="min-w-0 flex-1">{message}</p>
      {onRetry && (
        <button className="mac-btn-outline px-3 py-1.5 text-[13px]" onClick={onRetry}>
          <Icon name="refresh" size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ icon = "inbox", title, text }: { icon?: IconName; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="mac-icon-tile h-12 w-12 rounded-2xl">
        <Icon name={icon} size={21} />
      </span>
      <p className="mt-3 text-[14px] font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[12px] text-[var(--fg-2)]">{text}</p>}
    </div>
  );
}

/** Light markdown for AI replies: paragraphs, "- " bullets, "1. " lists, **bold** and # headings. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className={`space-y-2 text-[14px] leading-relaxed ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {lines.map((l, j) => (
              <span key={j}>
                {/^#+\s/.test(l) ? <strong>{inline(l.replace(/^#+\s/, ""))}</strong> : inline(l)}
                {j < lines.length - 1 && "\n"}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}

/** Shows Gemini output: structured JSON becomes labelled sections, plain text becomes rich text. */
export function AiBlock({ text }: { text: string }) {
  const parsed = parseAi(text);
  if (parsed === null || typeof parsed !== "object") return <RichText text={text} />;
  return <AiValue value={parsed} />;
}

function AiValue({ value, depth = 0 }: { value: unknown; depth?: number }): JSX.Element {
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="text-[13px] text-[var(--fg-3)]">None</p>;
    return (
      <ul className={depth ? "space-y-1.5" : "space-y-2"}>
        {value.map((v, i) => (
          <li key={i} className={typeof v === "object" && v ? "rounded-xl bg-[var(--card-soft)] p-2.5" : "flex gap-2 text-[14px]"}>
            {typeof v === "object" && v ? <AiValue value={v} depth={depth + 1} /> : (<><span className="text-[var(--fg-3)]">•</span><span>{String(v)}</span></>)}
          </li>
        ))}
      </ul>
    );
  }
  if (value && typeof value === "object") {
    return (
      <dl className="space-y-2">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <dt className="mac-label">{label(k)}</dt>
            <dd className="mt-0.5">
              {v && typeof v === "object" ? <AiValue value={v} depth={depth + 1} /> : <span className="text-[14px]">{String(v ?? "—")}</span>}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span className="text-[14px]">{String(value)}</span>;
}

/** Card framing for AI output, with the pixel logo pulsing while Gemini works. */
export function AiCard({
  title,
  text,
  loading,
  error,
  onRun,
  runLabel = "Generate",
  empty = "Ask Gemini for an analysis.",
}: {
  title: string;
  text?: string;
  loading: boolean;
  error?: string;
  onRun?: () => void;
  runLabel?: string;
  empty?: string;
}) {
  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          <Icon name="sparkle" size={13} className="text-[var(--accent)]" /> {title}
        </span>
      }
      action={
        onRun && (
          <button className="mac-btn-outline px-2.5 py-1 text-[12px]" onClick={onRun} disabled={loading}>
            <Icon name={text ? "refresh" : "sparkle"} size={13} />
            {loading ? "Thinking…" : text ? "Regenerate" : runLabel}
          </button>
        )
      }
    >
      {loading ? (
        <p className="flex items-center gap-2 text-[13px] text-[var(--fg-2)]">
          <LogoMark size={18} animated /> Gemini is working on it…
        </p>
      ) : error ? (
        <p className="text-[13px] text-[var(--bad)]">{error}</p>
      ) : text ? (
        <AiBlock text={text} />
      ) : (
        <p className="text-[13px] text-[var(--fg-2)]">{empty}</p>
      )}
    </Card>
  );
}
