"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthFrame from "@/components/AuthFrame";
import { Icon } from "@/components/Icon";
import { PasswordInput, inputCls } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"sign-in" | "reset">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const [notice, setNotice] = useState<string | null>(null);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
      setBusy(false);
      return;
    }
    const next = params.get("next");
    router.replace(next?.startsWith("/") ? next : "/dashboard");
    router.refresh();
  }

  async function sendReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/set-password`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setNotice("If that email has a HireFlow account, a reset link is on its way.");
  }

  return (
    <AuthFrame
      heading={mode === "sign-in" ? "Your whole team, in flow" : "Let's get you back in"}
      intro="People, hiring, leave, reviews and payroll in one calm workspace, with Gemini doing the busywork."
    >
      <h2 className="font-display text-[26px] font-semibold tracking-tight">{mode === "sign-in" ? "Welcome back" : "Forgot password"}</h2>
      <p className="mt-1 text-[13px] text-[var(--fg-2)]">
        {mode === "sign-in" ? "Use the email your HR admin invited." : "We'll email you a link to set a new password."}
      </p>

      {!configured && (
        <p className="mt-4 rounded-xl bg-[var(--card-soft)] p-3 text-[12px] text-[var(--bad)]">
          Supabase isn&apos;t configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local.
        </p>
      )}

      <form className="mt-5 space-y-3" onSubmit={mode === "sign-in" ? signIn : sendReset}>
        <label className="block">
          <span className="mac-label">Email</span>
          <input
            className={`${inputCls} mt-1 !py-2.5 !text-[15px]`}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </label>
        {mode === "sign-in" && (
          <div>
            <span className="flex items-center justify-between">
              <label htmlFor="password" className="mac-label">
                Password
              </label>
              <button
                type="button"
                className="text-[12px] text-[var(--fg-2)] hover:text-[var(--fg)]"
                onClick={() => {
                  setMode("reset");
                  setError(null);
                }}
              >
                Forgot password?
              </button>
            </span>
            <PasswordInput
              id="password"
              containerClassName="mt-1"
              className="!py-2.5 !text-[15px]"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        {error && <p className="text-[13px] text-[var(--bad)]">{error}</p>}
        {notice && <p className="text-[13px] text-[var(--ok)]">{notice}</p>}

        <button className="mac-btn-primary w-full py-2.5 text-[15px]" disabled={busy || !configured}>
          <Icon name={mode === "sign-in" ? "lock" : "mail"} size={15} />
          {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Send reset link"}
        </button>
      </form>

      {mode === "reset" && (
        <button
          className="mac-btn mt-3 w-full text-[13px] text-[var(--fg-2)]"
          onClick={() => {
            setMode("sign-in");
            setNotice(null);
            setError(null);
          }}
        >
          <Icon name="back" size={14} /> Back to sign in
        </button>
      )}

      <p className="mt-6 border-t border-[var(--line)] pt-4 text-[12px] leading-relaxed text-[var(--fg-3)]">
        No sign-up here: HireFlow accounts are created by your admin, who sends you an invite email.
      </p>
    </AuthFrame>
  );
}
