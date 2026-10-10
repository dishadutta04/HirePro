# HireFlow AI

AI-enabled HR management system: FastAPI backend, Next.js frontend, Supabase for sign-in (and optionally the database), Google Gemini for the AI features.

## Demo

Watch the walkthrough: [docs/demo.mp4](docs/demo.mp4)

## What is implemented

- Employee directory with search, profiles, photos and document uploads
- Recruitment: job postings and a drag-and-drop candidate pipeline (kanban)
- Leave requests, balances and approvals; daily attendance with a monthly calendar
- Performance review cycles with self and manager reviews
- Onboarding checklists with per-employee progress
- Payroll records (draft → processed → paid) and payslips
- HR policy chatbot
- Supabase sign-in, invite-only accounts, role-based pages **and role-based API access** (admin / manager / employee)
- Uploads in a private Supabase Storage bucket with short-lived signed links (or local disk in development)
- Gemini: resume scoring, interview questions, candidate comparison, leave-pattern analysis, review summaries, HR summary, employee bios, duplicate-profile detection

## Tech stack

- Backend: FastAPI, SQLAlchemy, SQLite or Supabase Postgres
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, `@supabase/ssr`
- Auth: Supabase Auth (email + password, invite emails)
- AI: Google Gemini (`google-generativeai`)

## How sign-in works

1. The person signs in on `/login` with Supabase (email + password). The session is kept in cookies, and `middleware.ts` sends anyone without one to `/login`.
2. Every API call sends the Supabase access token as `Authorization: Bearer …`.
3. FastAPI verifies the token (JWKS, or the legacy JWT secret) and looks the email up in its own `users` table. **Roles live in that table**, so only people an admin added can get in, even if someone signs up on Supabase directly.
4. There is no public sign-up. Admins invite people from **Users & roles**: the backend creates the HireFlow user with a role and asks Supabase to email an invite link. The person sets a password on `/set-password`.

If `SUPABASE_URL` is not set, the backend falls back to its original local login (`/api/auth/login`), which is handy for API testing in Swagger.

### Starting data

By default the app **starts from zero**: on an empty database only one admin is created, from `INITIAL_ADMIN_EMAIL`. That person signs in (after you add the same email in Supabase → Authentication → Users), then adds employees and invites everyone else. Set `SEED_DEMO_DATA=true` to fill an empty database with sample employees, jobs, leave and payroll instead.

## Setup

### 1) Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers**: keep Email enabled and turn **off** "Allow new users to sign up".
3. **Authentication → URL Configuration**: Site URL `http://localhost:3000` (your Vercel URL in production); add `http://localhost:3000/**` to Redirect URLs.
4. **Authentication → Emails → Templates**, so links work with server-side sessions:
   - Invite user: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept the invite</a>`
   - Reset password: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>`
5. **Create the first admin's login**: Authentication → Users → Add user → the `INITIAL_ADMIN_EMAIL` from `backend/.env`, with a password and "Auto confirm" on. (With `SEED_DEMO_DATA=true`, the demo admin is `admin@hireflow.ai`.)
6. Optional, to use Supabase as the database: Connect → **Session pooler** connection string → `DATABASE_URL` in `backend/.env`. Tables and demo data are created on first start.

### 2) Backend

```bash
cd backend
uv venv venv && source venv/bin/activate     # or: python3 -m venv venv (needs python3-venv)
uv pip install -r requirements-dev.txt       # app + test tools (or: pip install -r requirements-dev.txt)
cp ../.env.example .env                      # then fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3) Frontend

```bash
cd frontend
npm install
cp .env.example .env.local                   # then fill in the Supabase URL and anon key
npm run dev
```

App: http://localhost:3000

## Environment variables

| Where | Variable | What |
|---|---|---|
| backend/.env | `SUPABASE_URL` | Project URL; turns on Supabase token verification |
| backend/.env | `SUPABASE_SERVICE_ROLE_KEY` | Sends invite emails and stores uploads in Supabase Storage. Server only, never in the frontend |
| backend/.env | `SUPABASE_JWT_SECRET` | Only for projects on the legacy JWT secret |
| backend/.env | `DATABASE_URL` | SQLite by default, or the Supabase Postgres pooler string |
| backend/.env | `GEMINI_API_KEY` | AI features (without it, AI buttons explain that AI isn't set up) |
| backend/.env | `GEMINI_MODEL` | Optional; default `gemini-flash-latest` follows Google's current stable Flash model |
| backend/.env | `UPLOAD_BACKEND`, `SUPABASE_STORAGE_BUCKET` | `auto` (Supabase Storage when the service key is set, else local disk), `local` or `supabase`; bucket defaults to `hireflow-files` and is created as private |
| backend/.env | `SEED_DEMO_DATA`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME` | Start from zero with one admin (default), or with demo data |
| backend/.env | `FRONTEND_URL`, `CORS_ORIGINS` | Where invite links land; which origins may call the API |
| frontend/.env.local | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (the anon key is safe in the browser) |
| frontend/.env.local | `NEXT_PUBLIC_API_URL` | FastAPI base URL |

## Who sees what

| Role | Access |
|---|---|
| Admin | Everything, including everyone's payroll and Users & roles |
| Manager | Employee directory, recruitment, all leave and attendance, reviews, onboarding; **own** payslips only |
| Employee | Only their own profile, documents, leave, attendance, review, onboarding checklist and payslips; HR chatbot |

These rules are enforced by the API (`backend/main.py`, "Access rules"), not just hidden in the UI. The `hr` role currently has employee-level access.

## Project structure

```text
backend/
  main.py              all API routes
  services/auth.py     Supabase token verification, roles, invites
  services/storage.py  uploads: private Supabase Storage bucket + signed links, or local disk
  tests/               pytest suite (access rules, AI errors, storage)
  scripts/check_live.py  checks the real Supabase + Gemini setup
  ai/gemini_service.py Gemini prompts
  models/models.py     SQLAlchemy models
frontend/
  middleware.ts        session refresh + redirect to /login
  app/login, app/set-password, app/auth/confirm
  app/(app)/...        dashboard, employees, recruitment, leave, attendance,
                       performance, onboarding, payroll, chat, admin/users
  components/          AppShell (window + sidebar), ui primitives, logo, icons
  lib/                 api client, Supabase clients, types, formatting
  e2e/                 Playwright end-to-end tests + fake Supabase Auth server
```

## Tests

**Backend** (22 tests: access rules, AI error handling, Supabase Storage uploads):

```bash
cd backend && source venv/bin/activate
pytest tests -q
```

Uses a throwaway SQLite database with demo data and Supabase-style tokens signed with a test secret, so it needs no real Supabase project or Gemini key.

**End to end** (19 browser tests: sign-in, splash, show password, role access, every page for each role, leave → approval, attendance, kanban, add employee, reviews, payroll, mobile):

```bash
cd frontend
npm run test:e2e
```

Playwright starts its own fake Supabase Auth server (`e2e/fake-supabase.mjs`), a backend on a fresh demo database, and the frontend on ports 54321 / 8123 / 3123, so it never touches your real project and can run while `npm run dev` is open. Locally it uses your installed Google Chrome.

**CI**: `.github/workflows/ci.yml` runs both suites, the type check and a production build on every push and pull request.

**Live check** (after filling `backend/.env`): verifies Supabase sign-in keys, the service role key, the storage bucket, that every HireFlow user has a confirmed Supabase login, and that Gemini answers. Read-only apart from one tiny Gemini request.

```bash
cd backend && venv/bin/python scripts/check_live.py
```

## Known limitations

- Managers see and act on everyone, not only their own team (there's no team scoping yet).
- AI output quality hasn't been verified against the live Gemini API in this repo's tests; the calls are mocked.
