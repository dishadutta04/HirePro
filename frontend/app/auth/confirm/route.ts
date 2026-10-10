import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Landing point for Supabase email links. Signs the person in, then sends them on.
 * Set the Supabase email templates (Authentication → Emails) to:
 *   Invite user:     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite
 *   Reset password:  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 * Links that carry ?code= (Supabase's default PKCE flow) work too.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next =
    type === "invite" || type === "recovery" ? "/set-password" : nextParam?.startsWith("/") ? nextParam : "/dashboard";

  const supabase = supabaseServer();
  let ok = false;
  if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;

  if (ok) return NextResponse.redirect(new URL(next, request.url));
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "That link is invalid or has expired. Ask for a new one.");
  return NextResponse.redirect(url);
}
