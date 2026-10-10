"""Checks the real services HireFlow depends on, using backend/.env.

    cd backend && venv/bin/python scripts/check_live.py

Read-only: it changes nothing in Supabase. The only side effect is one tiny Gemini request.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx  # noqa: E402

from config import settings  # noqa: E402
from database import SessionLocal  # noqa: E402
from models.models import User  # noqa: E402

failures = 0


def ok(msg):
    print(f"  ✅ {msg}")


def bad(msg, fix):
    global failures
    failures += 1
    print(f"  ❌ {msg}\n     → {fix}")


def skip(msg):
    print(f"  ⏭  {msg}")


print("\n1. Supabase Auth (sign-in)")
if not settings.SUPABASE_URL:
    bad("SUPABASE_URL is empty, so the backend uses its old local login", "Set SUPABASE_URL in backend/.env to your project URL")
else:
    try:
        keys = httpx.get(f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json", timeout=10).json().get("keys", [])
        if keys or settings.SUPABASE_JWT_SECRET:
            ok(f"login tokens can be verified ({', '.join(k.get('alg', '?') for k in keys) or 'legacy JWT secret'})")
        else:
            bad("project has no signing keys and SUPABASE_JWT_SECRET is empty", "Copy the legacy JWT secret into SUPABASE_JWT_SECRET")
    except httpx.HTTPError as e:
        bad(f"can't reach {settings.SUPABASE_URL}: {e}", "Check SUPABASE_URL and your internet connection")

print("\n2. Supabase service role key (invites + uploads)")
supabase_users = None
if not settings.SUPABASE_SERVICE_ROLE_KEY:
    bad("SUPABASE_SERVICE_ROLE_KEY is empty: Invite user won't work and uploads stay on local disk",
        "Supabase → Project Settings → API Keys → service_role (secret) → paste into backend/.env")
elif settings.SUPABASE_URL:
    headers = {"apikey": settings.SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"}
    try:
        res = httpx.get(f"{settings.SUPABASE_URL}/auth/v1/admin/users", params={"per_page": 1000}, headers=headers, timeout=15)
        if res.status_code == 200:
            supabase_users = {u["email"].lower(): u for u in res.json().get("users", []) if u.get("email")}
            ok(f"service key works ({len(supabase_users)} Supabase login(s) found)")
        else:
            bad(f"service key rejected ({res.status_code})", "Copy the service_role key again; make sure it's the secret key, not the anon key")
        bucket = httpx.get(f"{settings.SUPABASE_URL}/storage/v1/bucket/{settings.SUPABASE_STORAGE_BUCKET}", headers=headers, timeout=15)
        if bucket.status_code == 200:
            public = bucket.json().get("public")
            (ok if not public else lambda m: bad(m, "Make the bucket private in Supabase → Storage"))(
                f"storage bucket '{settings.SUPABASE_STORAGE_BUCKET}' exists ({'public!' if public else 'private'})")
        else:
            ok(f"storage bucket '{settings.SUPABASE_STORAGE_BUCKET}' will be created (private) on the first upload")
    except httpx.HTTPError as e:
        bad(f"can't reach Supabase: {e}", "Check SUPABASE_URL")

print("\n3. HireFlow users ↔ Supabase logins")
db = SessionLocal()
try:
    people = db.query(User).filter(User.is_active == True).order_by(User.id).all()  # noqa: E712
finally:
    db.close()
if not people:
    bad("no active HireFlow users", "Set INITIAL_ADMIN_EMAIL in backend/.env and restart the backend on an empty database")
for u in people:
    label = f"{u.email} ({u.role}{', no employee profile' if not u.employee_id else ''})"
    if supabase_users is None:
        skip(f"{label}: can't check without the service key")
    elif u.email.lower() not in supabase_users:
        bad(f"{label}: no Supabase login yet", "Supabase → Authentication → Users → Add user (tick Auto Confirm), or use Invite user in the app")
    elif not supabase_users[u.email.lower()].get("email_confirmed_at"):
        bad(f"{label}: Supabase login not confirmed", "Supabase → Authentication → Users → open the user → Confirm email")
    else:
        ok(f"{label}: can sign in")

print("\n4. Gemini (AI features)")
if not settings.GEMINI_API_KEY:
    bad("GEMINI_API_KEY is empty: AI buttons will say AI isn't set up", "Get a key at https://aistudio.google.com/apikey and paste it into backend/.env")
else:
    from fastapi import HTTPException

    from ai.gemini_service import GeminiService
    try:
        reply = GeminiService()._generate("Reply with exactly the word OK.")
        ok(f"model '{settings.GEMINI_MODEL}' answered: {reply.strip()[:40]!r}")
    except HTTPException as e:
        bad(e.detail, "See the message above, then restart the backend after changing backend/.env")

print("\n" + ("All good — restart the backend if you changed backend/.env." if failures == 0 else f"{failures} thing(s) to fix."))
sys.exit(1 if failures else 0)
