import { expect, test } from "@playwright/test";
import { USERS, signIn, toast, watchErrors } from "./helpers";

// These run in order and build on each other (an employee asks for leave, a manager approves it…),
// against the fresh demo database the test backend starts with.
test.describe.configure({ mode: "serial" });

const REASON = `Fever (e2e ${Date.now()})`;

test("employee applies for leave and marks attendance", async ({ page }) => {
  await signIn(page, USERS.employee2);
  const errors = watchErrors(page);

  await page.goto("/leave");
  await page.getByRole("button", { name: "Sick", exact: true }).click();
  await page.getByPlaceholder("Optional").fill(REASON);
  await page.getByRole("button", { name: "Send request" }).click();
  await toast(page, "Leave request sent");
  await expect(page.getByText(REASON)).toBeVisible();

  await page.goto("/attendance");
  await page.getByRole("button", { name: "Save attendance" }).click();
  await toast(page, "Attendance marked");
  await expect(page.getByText("Present").first()).toBeVisible();
  errors.check();
});

test("manager approves the leave, and the employee sees it", async ({ page, browser }) => {
  await signIn(page, USERS.manager);
  const errors = watchErrors(page);
  await page.goto("/leave");
  await page.getByRole("button", { name: /Approvals/ }).click();
  await page.locator("li", { hasText: REASON }).getByRole("button", { name: "Approve" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await toast(page, "Leave approved");
  await expect(page.locator("li", { hasText: REASON })).toHaveCount(0);
  errors.check();

  const employee = await (await browser.newContext()).newPage();
  await signIn(employee, USERS.employee2);
  await employee.goto("/leave");
  await expect(employee.locator("li", { hasText: REASON }).getByText("Approved")).toBeVisible();
});

test("manager moves a candidate on the kanban board", async ({ page }) => {
  await signIn(page, USERS.manager);
  const errors = watchErrors(page);
  await page.goto("/recruitment/1");
  const column = (stage: string) => page.locator("div.w-\\[240px\\]", { hasText: stage }).first();
  await page.locator("button[draggable=true]", { hasText: "Rajesh Khanna" }).dragTo(column("Shortlisted"));
  await toast(page, "Moved to Shortlisted");
  await page.reload();
  await expect(column("Shortlisted").getByText("Rajesh Khanna")).toBeVisible();

  await page.locator("button[draggable=true]", { hasText: "Fatima Ali" }).click();
  await expect(page.getByRole("dialog").getByText("/ 100 match")).toBeVisible();
  errors.check();
});

test("manager adds an employee and lands on their profile", async ({ page }) => {
  await signIn(page, USERS.manager);
  const errors = watchErrors(page);
  await page.goto("/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  const dialog = page.getByRole("dialog");
  const field = (label: string) => dialog.locator("label", { hasText: label }).locator("input");
  await field("First name").fill("Neha");
  await field("Last name").fill("Kapoor");
  await field("Work email").fill(`neha.${Date.now()}@hireflow.ai`);
  await field("Employee code").fill(`EMP${Date.now() % 100000}`);
  await field("Designation").fill("QA Engineer");
  await field("Department").fill("Engineering");
  await field("Monthly salary").fill("90000");
  await dialog.getByRole("button", { name: "Add employee" }).click();
  await page.waitForURL(/\/employees\/\d+$/);
  await expect(page.getByRole("heading", { name: "Neha Kapoor" })).toBeVisible();
  errors.check();
});

test("AI buttons explain that AI isn't set up (no fake output)", async ({ page }) => {
  await signIn(page, USERS.manager);
  const errors = watchErrors(page, ["GET /api/analytics/hr-summary 503"]);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByText(/AI isn't set up yet/)).toBeVisible();
  errors.check();
});

test("admin sees a clear message when invites aren't configured", async ({ page }) => {
  await signIn(page, USERS.admin);
  const errors = watchErrors(page, ["POST /api/users/invite 503"]);
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Invite user" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("label", { hasText: "Full name" }).locator("input").fill("New Person");
  await dialog.locator("input[type=email]").fill("new.person@hireflow.ai");
  await dialog.getByRole("button", { name: "Send invite" }).click();
  await toast(page, /Supabase invites aren't configured/);
  errors.check();
});

test("admin processes payroll through to paid", async ({ page }) => {
  await signIn(page, USERS.admin);
  const errors = watchErrors(page);
  await page.goto("/payroll");
  await page.getByRole("button", { name: "Mark paid" }).first().click();
  await toast(page, "Marked as paid");
  errors.check();
});

test("employee completes a self-review the manager then finishes", async ({ page, browser }) => {
  await signIn(page, USERS.admin);
  await page.goto("/performance");
  await page.getByRole("button", { name: "New cycle" }).click();
  const cycleName = `E2E cycle ${Date.now()}`;
  await page.getByRole("dialog").locator("label", { hasText: "Name" }).locator("input").fill(cycleName);
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await toast(page, "Cycle created as draft");
  await page.getByRole("button", { name: "Activate & create reviews" }).click();
  await toast(page, "Cycle activated");

  const employee = await (await browser.newContext()).newPage();
  await signIn(employee, USERS.employee);
  const errors = watchErrors(employee);
  await employee.goto("/performance");
  await employee.getByRole("button", { name: new RegExp(cycleName) }).click();
  await employee.getByRole("radio", { name: "4" }).click();
  await employee.locator("label", { hasText: "Comments" }).locator("textarea").fill("Shipped the leave module");
  await employee.getByRole("button", { name: "Submit self-assessment" }).click();
  await toast(employee, "Self-assessment submitted");
  errors.check();

  await page.reload();
  await page.getByRole("button", { name: new RegExp(cycleName) }).click();
  await page.getByRole("button", { name: /Amit Kumar/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Shipped the leave module")).toBeVisible();
  await dialog.getByRole("radio", { name: "5" }).click();
  await dialog.locator("label", { hasText: "Comments" }).locator("textarea").fill("Great half");
  await dialog.getByRole("button", { name: "Complete review" }).click();
  await toast(page, "Review completed");
});
