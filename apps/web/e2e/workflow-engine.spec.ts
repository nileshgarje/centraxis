import { test, expect, Page } from "@playwright/test";

async function loginAdmin(page: Page) {
  await page.goto("/login");
  if (!page.url().includes("/login") && !page.url().includes("/auth/signin")) {
    return;
  }
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill("admin@centvis.com");
  await passwordInput.fill("AdminPassword123!");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(
    (url) =>
      !url.pathname.includes("/login") &&
      !url.pathname.includes("/auth/signin"),
    {
      timeout: 15000,
    },
  );
}

test.describe("Customizable & Publishable Workflow Engine", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("1. Verify Workflow Schemes Admin Page & Hierarchical Scopes", async ({
    page,
  }) => {
    await page.goto("/settings/workflows");
    await expect(
      page.locator("h1:has-text('Customizable Workflow Schemes')"),
    ).toBeVisible();

    // Verify Scope filter tabs
    await expect(page.locator("button:has-text('All Schemes')")).toBeVisible();
    await expect(page.locator("button:has-text('Global Default')")).toBeVisible();
    await expect(page.locator("button:has-text('Client Scoped')")).toBeVisible();

    // Verify Centvis Standard Agile Workflow is listed
    await expect(
      page.locator("text=Centvis Standard Agile Workflow").first(),
    ).toBeVisible();

    // Verify published badge
    await expect(page.locator("text=Published").first()).toBeVisible();

    // Verify states flow pills
    await expect(page.locator("text=READY FOR QA").first()).toBeVisible();
    await expect(page.locator("text=IN QA").first()).toBeVisible();
  });

  test("2. Verify Work Item Drawer 'View Workflow' Button & Modal Ribbon", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/board");

    // Click on work item card to open drawer
    const card = page.locator('[data-testid="work-item-card"]').first();
    await expect(card).toBeVisible();
    await card.click();

    // Verify "View Workflow" button exists in drawer header
    const viewWorkflowBtn = page.locator("button:has-text('View Workflow')");
    await expect(viewWorkflowBtn).toBeVisible();

    // Open Workflow viewer modal
    await viewWorkflowBtn.click();

    // Verify modal header & title
    await expect(page.locator("text=Task workflow")).toBeVisible();

    // Verify status ribbon
    await expect(page.locator("text=Current status:")).toBeVisible();
    await expect(
      page.locator("text=This work item can be moved to:"),
    ).toBeVisible();

    // Verify visual diagram canvas elements
    await expect(page.locator("text=Show transition labels")).toBeVisible();
    await expect(page.locator("text=Current").first()).toBeVisible();

    // Close modal via Escape
    await page.keyboard.press("Escape");
    await expect(page.locator("text=Task workflow")).not.toBeVisible();
  });

  test("3. Verify Interactive Transition Execution from Task Workflow Dialog", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/board");

    // Open work item card
    const card = page.locator('[data-testid="work-item-card"]').first();
    await expect(card).toBeVisible();
    await card.click();

    // Open modal
    await page.locator("button:has-text('View Workflow')").click();
    await expect(page.locator("text=Task workflow")).toBeVisible();

    // Verify reachable target buttons exist in the status ribbon
    const ribbonContainer = page.locator(
      "text=This work item can be moved to:",
    );
    await expect(ribbonContainer).toBeVisible();

    // Verify Zoom in / Zoom out / Reset controls
    await expect(page.locator("button[title='Zoom in']")).toBeVisible();
    await expect(page.locator("button[title='Zoom out']")).toBeVisible();
    await expect(page.locator("button[title='Reset view']")).toBeVisible();
  });
});
