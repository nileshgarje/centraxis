import { test, expect } from "@playwright/test";

test.describe("Centraxis Agile Platform E2E Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    if (page.url().includes("/login") || page.url().includes("/auth/signin")) {
      await page.locator('input[type="email"]').fill("admin@centvis.com");
      await page.locator('input[type="password"]').fill("AdminPassword123!");
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(
        (url) =>
          !url.pathname.includes("/login") &&
          !url.pathname.includes("/auth/signin"),
        { timeout: 15000 },
      );
    }
    await page.goto("/");
  });

  test("should render the Centraxis header shell and project selector", async ({
    page,
  }) => {
    await expect(page.locator("text=Centraxis")).toBeVisible();
    await expect(page.locator("text=Centvis")).toBeVisible();
    await expect(page.locator("text=Active Board")).toBeVisible();
    await expect(page.locator('[data-testid="tab-backlog"]')).toBeVisible();
    await expect(page.locator("text=Squads")).toBeVisible();
    await expect(page.locator("text=Analytics")).toBeVisible();
  });

  test("should navigate smoothly across views", async ({ page }) => {
    // 1. Backlog View
    await page.click('[data-testid="tab-backlog"]');
    await expect(page.locator("text=Backlog Planning")).toBeVisible();

    // 2. Squads
    await page.click("text=Squads");
    await expect(
      page.locator("text=Assigned Squads & Engineering Teams"),
    ).toBeVisible();

    // 3. Analytics
    await page.click("text=Analytics");
    await expect(page.locator("text=Sprint Burndown Chart")).toBeVisible();
    await expect(page.locator("text=Rolling Velocity")).toBeVisible();

    // Return to Board
    await page.click("text=Active Board");
    await expect(page.locator("text=To Do")).toBeVisible();
    await expect(page.locator("text=In Progress")).toBeVisible();
    await expect(page.locator("text=Done")).toBeVisible();
  });

  test("should open the AI Story Agent modal and preview INVEST stories", async ({
    page,
  }) => {
    // Trigger modal via unified + Create dropdown
    await page.click('button:has-text("Create")');
    await page.click("text=AI Story Agent");
    await expect(page.locator("text=Centraxis AI Story Agent")).toBeVisible();

    // Fill feature brief prompt
    const promptInput = page.locator(
      'input[placeholder*="Export sprint burndown chart"]',
    );
    await promptInput.fill(
      "Export sprint burndown chart to PDF with velocity forecast",
    );

    // Click Generate
    await page.click('button:has-text("Generate")');

    // Wait for INVEST Story Preview
    await expect(page.locator("text=INVEST Story Preview")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Story Points")).toBeVisible();
    await expect(
      page.locator("text=Acceptance Criteria (Gherkin Scenarios)"),
    ).toBeVisible();
    await expect(
      page.locator("text=Technical Subtasks Breakdown"),
    ).toBeVisible();

    // Close modal
    await page.keyboard.press("Escape");
    await expect(
      page.locator("text=Centraxis AI Story Agent"),
    ).not.toBeVisible();
  });
});
