"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { LogoMark, Wordmark } from "./Logo";
import { Avatar, Loading } from "./ui";
import ThemeToggle from "./ThemeToggle";
import { ApiError, api, errorMessage } from "@/lib/api";
import { label } from "@/lib/format";
import type { Me, Role } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";

type Toast = { id: number; text: string; tone: "ok" | "bad" };

type MeCtx = {
  me: Me;
  /** Admins and managers: the roles the backend lets approve, hire and review. */
  isManager: boolean;
  isAdmin: boolean;
  toast: (text: string, tone?: Toast["tone"]) => void;
  refreshMe: () => Promise<void>;
};

const Ctx = createContext<MeCtx | null>(null);

export function useMe() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMe must be used inside AppShell");
  return ctx;
}

type NavItem = { href: string; label: string; icon: IconName; roles?: Role[] };

const MANAGERS: Role[] = ["admin", "manager"];

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "home" },
      { href: "/employees", label: "Employees", icon: "users", roles: MANAGERS },
      { href: "/recruitment", label: "Recruitment", icon: "briefcase", roles: MANAGERS },
    ],
  },
  {
    section: "Time & people",
    items: [
      { href: "/leave", label: "Leave", icon: "calendar" },
      { href: "/attendance", label: "Attendance", icon: "clock" },
      { href: "/performance", label: "Performance", icon: "star" },
      { href: "/onboarding", label: "Onboarding", icon: "clipboard" },
      { href: "/payroll", label: "Payroll", icon: "wallet" },
    ],
  },
  { section: "Help", items: [{ href: "/chat", label: "HR Assistant", icon: "message" }] },
  { section: "Admin", items: [{ href: "/admin/users", label: "Users & roles", icon: "shield", roles: ["admin"] }] },
];

const matches = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refreshMe = useCallback(async () => {
    try {
      setMe(await api<Me>("/api/auth/me"));
      setLoadError(null);
    } catch (e) {
      setLoadError({ status: e instanceof ApiError ? e.status : 0, message: errorMessage(e) });
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  useEffect(() => setMenuOpen(false), [path]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  if (!me) {
    return (
      <main className="desk flex min-h-screen items-center justify-center p-4 text-[var(--fg)]">
        <div className="mac-card max-w-sm p-6 text-center">
          {loadError ? (
            <>
              <LogoMark size={44} className="mx-auto" />
              <p className="mt-4 text-[15px] font-semibold">{loadError.status === 403 ? "No HireFlow access yet" : "Something went wrong"}</p>
              <p className="mt-1 text-[13px] text-[var(--fg-2)]">{loadError.message}</p>
              <div className="mt-4 grid gap-2">
                {loadError.status !== 403 && (
                  <button className="mac-btn-primary w-full py-2.5 text-[14px]" onClick={() => void refreshMe()}>
                    Try again
                  </button>
                )}
                <button className="mac-btn-outline w-full py-2.5 text-[14px]" onClick={signOut}>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <Loading text="Loading your workspace…" />
          )}
        </div>
      </main>
    );
  }

  const isAdmin = me.role === "admin";
  const isManager = MANAGERS.includes(me.role);
  const allowed = (item: NavItem) => !item.roles || item.roles.includes(me.role);
  const current = NAV.flatMap((s) => s.items).find((i) => matches(path, i.href));
  // Everyone may open their own profile, even without access to the directory.
  const ownProfile = me.employee !== null && path === `/employees/${me.employee.id}`;
  const blocked = current && !allowed(current) && !ownProfile;

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="mac-lights hidden px-4 pt-4 md:flex" aria-hidden="true">
        <span className="mac-light close" />
        <span className="mac-light min" />
        <span className="mac-light max" />
      </div>
      <Link href="/dashboard" className="px-4 pb-2 pt-5">
        <Wordmark size={26} tagline />
      </Link>
      <div className="scroll-quiet flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
        {NAV.map(({ section, items }) => {
          const visible = items.filter(allowed);
          if (!visible.length) return null;
          return (
            <div key={section}>
              <p className="mac-label px-2 pb-1 text-[10px] uppercase tracking-wider text-[var(--fg-3)]">{section}</p>
              {visible.map((item) => (
                <Link key={item.href} href={item.href} className="mac-nav" aria-current={matches(path, item.href) ? "page" : undefined}>
                  <Icon name={item.icon} size={15} className={matches(path, item.href) ? "" : "text-[var(--fg-2)]"} />
                  {item.label}
                </Link>
              ))}
              {section === "Workspace" && !isManager && me.employee && (
                <Link
                  href={`/employees/${me.employee.id}`}
                  className="mac-nav"
                  aria-current={path === `/employees/${me.employee.id}` ? "page" : undefined}
                >
                  <Icon name="user" size={15} className="text-[var(--fg-2)]" />
                  My profile
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-[var(--line)] p-2.5">
        <div className="flex items-center gap-2.5 rounded-xl bg-[var(--card)] px-2 py-2 shadow-[var(--shadow-card)]">
          <Avatar name={me.full_name} size={30} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{me.full_name}</p>
            <p className="truncate text-[11px] text-[var(--fg-2)]">{label(me.role)}{me.employee?.designation ? ` · ${me.employee.designation}` : ""}</p>
          </div>
          <button className="mac-btn !p-1.5 text-[var(--fg-2)]" onClick={signOut} title="Sign out" aria-label="Sign out">
            <Icon name="logout" size={15} />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <Ctx.Provider value={{ me, isAdmin, isManager, toast, refreshMe }}>
      <main className="desk min-h-screen text-[var(--fg)] md:p-6">
        <div className="mac-window animate-window relative mx-auto flex h-screen max-w-[1500px] overflow-hidden md:h-[calc(100vh-48px)] md:rounded-[16px]">
          <aside className="mac-sidebar hidden w-[236px] shrink-0 md:block">{sidebar}</aside>

          {menuOpen && (
            <div className="fixed inset-0 z-40 bg-black/25 md:hidden" onClick={() => setMenuOpen(false)}>
              <aside className="mac-window h-full w-[260px]" onClick={(e) => e.stopPropagation()}>
                {sidebar}
              </aside>
            </div>
          )}

          <section className="flex min-w-0 flex-1 flex-col">
            <header className="mac-titlebar flex items-center gap-2 px-4 py-2.5">
              <button className="mac-btn !p-1.5 md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                <Icon name="menu" />
              </button>
              <LogoMark size={24} className="md:hidden" />
              <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--fg-2)]">
                {path.startsWith("/employees/") ? "Employee profile" : path.startsWith("/recruitment/") ? "Job pipeline" : current?.label ?? "HireFlow"}
              </p>
              <ThemeToggle />
              <Link href="/chat" className="mac-btn-accent px-3 py-1.5 text-[13px]">
                <Icon name="sparkle" size={14} />
                <span className="hidden sm:inline">Ask HR</span>
              </Link>
            </header>

            <div className="scroll-quiet flex-1 overflow-y-auto p-4 sm:p-6">
              {blocked ? (
                <div className="mac-card mx-auto mt-10 max-w-sm p-6 text-center">
                  <Icon name="lock" size={22} className="mx-auto text-[var(--fg-2)]" />
                  <p className="mt-3 text-[15px] font-semibold">You don&apos;t have access to this page</p>
                  <p className="mt-1 text-[13px] text-[var(--fg-2)]">Ask an admin if you think you should.</p>
                  <Link href="/dashboard" className="mac-btn-primary mt-4 w-full py-2.5 text-[14px]">
                    Back to dashboard
                  </Link>
                </div>
              ) : (
                <div className="animate-fade-in mx-auto max-w-[1200px]" key={path}>
                  {children}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="pointer-events-none fixed bottom-5 right-5 z-[60] space-y-2" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="mac-card animate-fade-in flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium">
              <Icon name={t.tone === "ok" ? "check" : "info"} size={15} className={t.tone === "ok" ? "text-[var(--ok)]" : "text-[var(--bad)]"} />
              {t.text}
            </div>
          ))}
        </div>
      </main>
    </Ctx.Provider>
  );
}

/** Runs an API action with a toast on success or failure; returns whether it worked. */
export function useAction() {
  const { toast } = useMe();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn: () => Promise<unknown>, success?: string) => {
      setBusy(true);
      try {
        await fn();
        if (success) toast(success);
        return true;
      } catch (e) {
        toast(errorMessage(e), "bad");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, run };
}
