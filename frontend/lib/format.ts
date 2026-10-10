const inrFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const inr = (n: number | null | undefined) => (n == null ? "—" : inrFormat.format(n));

export function fmtDate(iso: string | null | undefined, withYear = true) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

export const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "work_from_home" → "Work from home" */
export const label = (s: string | null | undefined) => (s ? (s.charAt(0).toUpperCase() + s.slice(1)).replace(/_/g, " ") : "—");

export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

export function daysBetween(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
}

/** Gemini often wraps JSON in ```json fences; returns the parsed value, or null for plain text. */
export function parseAi<T = unknown>(text: string | null | undefined): T | null {
  if (!text) return null;
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(stripped) as T;
  } catch {
    return null;
  }
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
