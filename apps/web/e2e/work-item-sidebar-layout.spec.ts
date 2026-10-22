import { test, expect } from "@playwright/test";

test.describe("Work Item Sidebar Layout & Type Selector", () => {
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

  test("1. Type selector displays only a single icon (no duplicate icons)", async ({
    page,
  }) => {
    // Check in detail drawer on the board
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="work-item-card"]', {
      timeout: 15000,
    });

    await page.locator('[data-item-key="CTX-1"]').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // Locate the type selector trigger inside the drawer
    const drawer = page.locator('[role="dialog"]');
    // Type selector is inside the drawer body
    const typeTrigger = drawer
      .locator('button[role="combobox"]')
      .filter({ hasText: /Story|Task|Bug|Epic/i })
      .first();

    await expect(typeTrigger).toBeVisible();

    // Verify exactly 1 type icon (excluding the dropdown chevron) inside the trigger button
    const typeIcons = typeTrigger.locator("svg:not(.lucide-chevron-down)");
    expect(await typeIcons.count()).toBe(1);

    // Verify dropdown chevron is present
    const chevronIcon = typeTrigger.locator("svg.lucide-chevron-down");
    expect(await chevronIcon.count()).toBe(1);

    // Also verify in full-page view
    await page.goto("/client-apex/CTX-1");
    await page.waitForSelector("text=CTX-1", { timeout: 10000 });

    const fullPageTypeTrigger = page
      .locator('button[role="combobox"]')
      .filter({ hasText: /Story|Task|Bug|Epic/i })
      .first();

    await expect(fullPageTypeTrigger).toBeVisible();
    const fullPageTypeIcons = fullPageTypeTrigger.locator("svg:not(.lucide-chevron-down)");
    expect(await fullPageTypeIcons.count()).toBe(1);

    const fullPageChevron = fullPageTypeTrigger.locator("svg.lucide-chevron-down");
    expect(await fullPageChevron.count()).toBe(1);
  });

  test("2. Sidebar header buttons and controls do not overlap and remain accessible at different viewports", async ({
    page,
  }) => {
    // Test standard desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-item-key="CTX-1"]', { timeout: 15000 });
    await page.locator('[data-item-key="CTX-1"]').first().click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Close button (X) must be visible and not overlapped
    const closeBtn = drawer.locator('button:has(svg.lucide-x), [data-state="open"] button:has-text("Close"), button[aria-label="Close"], button.absolute').first();
    await expect(closeBtn).toBeVisible();

    // Key badge, status trigger, workflow button, and open in new tab button
    await expect(drawer.locator("text=CTX-1").first()).toBeVisible();
    const statusTrigger = drawer.locator('button[role="combobox"]').first();
    await expect(statusTrigger).toBeVisible();

    const workflowBtn = drawer.getByRole("button", { name: /Workflow/i });
    await expect(workflowBtn).toBeVisible();

    const openInNewTab = drawer.getByRole("link", { name: /Open in new tab/i });
    await expect(openInNewTab).toBeVisible();

    // Verify bounding box of close button does not overlap workflow or open in new tab buttons
    const closeBox = await closeBtn.boundingBox();
    const openBox = await openInNewTab.boundingBox();

    if (closeBox && openBox) {
      // The close button is on the top-right; it should either be strictly to the right or openBox must be to the left
      expect(openBox.x + openBox.width).toBeLessThanOrEqual(closeBox.x + 5);
    }

    // Now test a compact viewport (e.g. tablet / small screen 768px width)
    await page.setViewportSize({ width: 768, height: 800 });
    await page.waitForTimeout(500);

    // Ensure buttons are still visible and clickable
    await expect(statusTrigger).toBeVisible();
    await expect(workflowBtn).toBeVisible();
    await expect(openInNewTab).toBeVisible();
    await expect(closeBtn).toBeVisible();

    // Test clicking close button closes the drawer smoothly
    await closeBtn.click();
    await expect(drawer).not.toBeVisible();
  });
});
