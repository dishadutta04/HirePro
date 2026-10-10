import { expect, test } from "@playwright/test";
import { USERS, isolate, signIn, skipSplash, watchErrors } from "./helpers";

test("signed-out visitors are sent to login, then back where they were going", async ({ page }) => {
  await isolate(page);
  await skipSplash(page);
  await page.goto("/payroll");
  await expect(page).toHaveURL(/\/login\?next=%2Fpayroll/);

  await page.locator("input[type=email]").fill(USERS.employee);
  await page.locator("input[autocomplete=current-password]").fill("x");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/payroll$/);
  await expect(page.getByRole("heading", { name: "My payslips" })).toBeVisible();
});

test("splash plays once per session and can be skipped", async ({ page }) => {
  await isolate(page);
  await page.goto("/login");
  const splash = page.locator(".splash-icon");
  await expect(splash).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(splash).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(splash).toHaveCount(0);
});

test("password can be shown and hidden", async ({ page }) => {
  await isolate(page);
  await skipSplash(page);
  await page.goto("/login");
  const password = page.locator("input[autocomplete=current-password]");
  await password.fill("Secret@123");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("employees can't open manager pages", async ({ page }) => {
  await signIn(page, USERS.employee);
  await page.goto("/employees");
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
  await expect(page.getByRole("link", { name: "Users & roles" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "My profile" })).toBeVisible();
});

test("theme switch persists across reloads", async ({ page }) => {
  await signIn(page, USERS.employee);
  const errors = watchErrors(page);
  await page.getByRole("radio", { name: "Dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("radio", { name: "Light mode" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  errors.check();
});

test("sign out returns to login", async ({ page }) => {
  await signIn(page, USERS.manager);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
