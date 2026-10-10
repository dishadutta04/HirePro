import { expect, test } from "@playwright/test";
import { USERS, signIn, watchErrors } from "./helpers";

// Every page each role can reach must load without browser errors or failed API calls
// (a 403 here would mean the UI asks for data the role isn't allowed to see).
const PAGES: Record<string, { email: string; paths: string[] }> = {
  admin: {
    email: USERS.admin,
    paths: ["/dashboard", "/employees", "/employees/1", "/recruitment", "/recruitment/1", "/leave", "/attendance",
            "/performance", "/onboarding", "/payroll", "/chat", "/admin/users"],
  },
  manager: {
    email: USERS.manager,
    paths: ["/dashboard", "/employees", "/recruitment/1", "/leave", "/attendance", "/performance", "/onboarding", "/payroll"],
  },
  employee: {
    email: USERS.employee,
    paths: ["/dashboard", "/leave", "/attendance", "/performance", "/onboarding", "/payroll", "/chat"],
  },
};

for (const [role, { email, paths }] of Object.entries(PAGES)) {
  test(`${role}: every page loads cleanly`, async ({ page }) => {
    await signIn(page, email);
    const errors = watchErrors(page);
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("Something went wrong"), path).toHaveCount(0);
      await expect(page.getByText("Couldn't reach the HireFlow server"), path).toHaveCount(0);
    }
    errors.check();
  });
}

test("employee's own profile opens from the sidebar", async ({ page }) => {
  await signIn(page, USERS.employee);
  const errors = watchErrors(page);
  await page.getByRole("link", { name: "My profile" }).click();
  await expect(page.getByRole("heading", { name: "Amit Kumar" })).toBeVisible();
  await expect(page.getByText(/Reports to/)).toBeVisible();
  errors.check();
});

test("mobile layout has no sideways scroll and a working menu", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await signIn(page, USERS.employee);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/\/leave$/);
  await context.close();
});
