import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * End-to-end tests run the real backend and frontend against a fake Supabase Auth server
 * (e2e/fake-supabase.mjs) and a throwaway SQLite database seeded with demo data, on their own
 * ports, so they never touch a real Supabase project and can run alongside `npm run dev`.
 */
const FAKE_SUPABASE = "http://localhost:54321";
const API = "http://localhost:8123";
const APP = "http://localhost:3123";
const DB = join(tmpdir(), "hireflow-e2e.db");
const PYTHON = process.env.E2E_PYTHON ?? (existsSync("../backend/venv/bin/python") ? "venv/bin/python" : "python");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: APP,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Locally use the installed Google Chrome; CI installs Playwright's Chromium.
    ...(process.env.CI ? {} : { channel: "chrome" }),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node e2e/fake-supabase.mjs",
      url: `${FAKE_SUPABASE}/health`,
      reuseExistingServer: false,
    },
    {
      // Fresh database every run so the flows always start from the same demo data.
      command: `rm -f "${DB}" && ${PYTHON} -m uvicorn main:app --port 8123`,
      cwd: "../backend",
      url: `${API}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: `sqlite:///${DB}`,
        SUPABASE_URL: FAKE_SUPABASE,
        SUPABASE_JWT_SECRET: "e2e-test-secret",
        SUPABASE_SERVICE_ROLE_KEY: "",
        SEED_DEMO_DATA: "true",
        UPLOAD_BACKEND: "local",
        GEMINI_API_KEY: "",
        CORS_ORIGINS: APP,
      },
    },
    {
      command: "npx next dev -p 3123",
      url: `${APP}/login`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
        NEXT_PUBLIC_API_URL: API,
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
