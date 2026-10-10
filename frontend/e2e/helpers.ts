import { expect, type Page } from "@playwright/test";

// Demo accounts created by SEED_DEMO_DATA=true.
export const USERS = {
  admin: "admin@hireflow.ai",
  manager: "priya.sharma@hireflow.ai",
  employee: "amit.kumar@hireflow.ai",
  employee2: "sneha.patel@hireflow.ai",
} as const;

/** Never let a test reach a real Supabase project, even if a local .env.local leaks in. */
export async function isolate(page: Page) {
  await page.route(/\.supabase\.co\//, (route) => route.abort());
}

export async function skipSplash(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("hireflow-splash-seen", "1");
    } catch {
      // ignore
    }
  });
}

export async function signIn(page: Page, email: string) {
  await isolate(page);
  await skipSplash(page);
  await page.goto("/login");
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[autocomplete=current-password]").fill("any-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

/**
 * Collects browser errors and failed API calls. `allow` lists expected failures, e.g. "POST /api/users/invite 503".
 */
export function watchErrors(page: Page, allow: string[] = []) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    const url = new URL(r.url());
    if (url.port !== "8123" || r.status() < 400) return;
    const key = `${r.request().method()} ${url.pathname} ${r.status()}`;
    if (!allow.includes(key)) problems.push(key);
  });
  return {
    problems,
    check: () => expect(problems, problems.join("\n")).toEqual([]),
  };
}

/** Toasts confirm every action; waiting for one proves the API call succeeded. */
export const toast = (page: Page, text: string | RegExp) =>
  expect(page.locator("[aria-live=polite]").getByText(text)).toBeVisible({ timeout: 10_000 });
