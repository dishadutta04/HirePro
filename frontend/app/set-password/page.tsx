"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import AuthFrame from "@/components/AuthFrame";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Reached from an invite or password-reset email (via /auth/confirm, which signs the person in). */
export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <AuthFrame heading="Almost there, set your password" intro="Choose a password for your HireFlow account. You'll use it with your work email from now on.">
      <h2 className="font-display text-[22px] font-semibold tracking-tight">New password</h2>
      <form className="mt-5 space-y-3" onSubmit={save}>
        <label className="block">
          <span className="mac-label">Password</span>
          <PasswordInput containerClassName="mt-1" className="!py-2.5" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mac-label">Confirm password</span>
          <PasswordInput containerClassName="mt-1" className="!py-2.5" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </label>
        {error && <p className="text-[13px] text-[var(--bad)]">{error}</p>}
        <button className="mac-btn-primary w-full py-2.5 text-[15px]" disabled={busy}>
          <Icon name="check" size={15} />
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </AuthFrame>
  );
}
