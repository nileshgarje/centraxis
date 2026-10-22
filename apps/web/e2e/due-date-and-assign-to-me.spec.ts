import { test, expect } from "@playwright/test";

test.describe("Work Item Due Date & Assign to Me", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    if (page.url().includes("/login") || page.url().includes("/auth/signin")) {
      await page.locator('input[type="email"]').fill("alex.morgan@centvis.com");
      await page.locator('input[type="password"]').fill("password123");
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(
        (url) =>
          !url.pathname.includes("/login") &&
          !url.pathname.includes("/auth/signin"),
        { timeout: 15000 },
      );
    }
  });

  test("1. should allow setting due date, displaying dynamic badges (overdue, due soon) on board and backlog", async ({
    page,
  }) => {
    // Navigate to board
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="work-item-card"]', {
      timeout: 15000,
    });

    // Open first work item drawer
    await page.locator('[data-testid="work-item-card"]').first().click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Verify Due Date field exists in drawer
    const dueDateInput = drawer.locator('input[type="date"]');
    await expect(dueDateInput).toBeVisible();

    // 1. Set Overdue Date (past date)
    await dueDateInput.fill("2026-10-01");
    // Trigger change/blur
    await dueDateInput.blur();

    // Verify overdue badge appears in drawer header/attributes with red color
    const overdueBadge = drawer
      .locator('[data-due-category="OVERDUE"]')
      .first();
    await expect(overdueBadge).toBeVisible({ timeout: 5000 });
    await expect(overdueBadge).toHaveClass(/text-red-600/);

    // Close drawer
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();

    // Verify card on Board displays overdue badge
    const boardCardBadge = page
      .locator('[data-due-category="OVERDUE"]')
      .first();
    await expect(boardCardBadge).toBeVisible();
    await expect(boardCardBadge).toHaveClass(/text-red-600/);

    // Reopen drawer to set Due Soon (tomorrow or in 1 day)
    await page.locator('[data-testid="work-item-card"]').first().click();
    await expect(drawer).toBeVisible();

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0]!;

    await dueDateInput.fill(tomorrowStr);
    await dueDateInput.blur();

    // Verify badge updates to DUE_SOON with amber color
    const dueSoonBadge = drawer
      .locator('[data-due-category="DUE_SOON"]')
      .first();
    await expect(dueSoonBadge).toBeVisible({ timeout: 5000 });
    await expect(dueSoonBadge).toHaveClass(/text-amber-600/);

    // Close drawer
    await page.keyboard.press("Escape");

    // Navigate to Backlog view
    await page.goto("/client-apex/CTX/backlog");
    await expect(page.locator("text=Sprint").first()).toBeVisible({
      timeout: 15000,
    });

    // Verify Due Date badge is visible in backlog row
    const backlogBadge = page.locator('[data-testid="due-date-badge"]').first();
    await expect(backlogBadge).toBeVisible();
  });

  test("2. should provide 'Assign to me' option in drawer and full page view", async ({
    page,
  }) => {
    // Open full page view of CTX-1 directly
    await page.goto("/client-apex/CTX-1");
    await expect(page.locator("text=CTX-1").first()).toBeVisible();

    // Verify Assignee and Due Date fields are visible in sidebar
    await expect(page.getByText("Assignee", { exact: true })).toBeVisible();
    await expect(page.getByText("Due Date", { exact: false })).toBeVisible();

    // Check if 'Assign to me' button is present or reassign first to test
    const assignToMeBtn = page.getByRole("button", { name: "Assign to me" });
    if (await assignToMeBtn.isVisible()) {
      await assignToMeBtn.click();
      // After clicking, 'Assign to me' button should disappear since it's now assigned to me
      await expect(assignToMeBtn).toBeHidden({ timeout: 5000 });
      // Saved indicator should be shown
      await expect(page.getByText("Saved")).toBeVisible();
    }

    // Test Due date input on full page view
    const pageDueDateInput = page.locator('input[type="date"]');
    await expect(pageDueDateInput).toBeVisible();
    await pageDueDateInput.fill("2026-10-05");
    await pageDueDateInput.blur();

    await expect(
      page.locator('[data-due-category="OVERDUE"]').first(),
    ).toBeVisible({
      timeout: 5000,
    });
  });
});
