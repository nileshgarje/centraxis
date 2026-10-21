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

test.describe("Full Centraxis Platform Screen Verification", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("1. Verify Active Kanban Board & Item Drawer", async ({ page }) => {
    await page.goto("/client-apex/CTX/board");
    await expect(
      page.locator('svg[aria-label="Centvis"]').first(),
    ).toBeVisible();

    // Verify Active Board
    await expect(page.locator("text=ACTIVE").first()).toBeVisible();

    // Verify Kanban columns
    await expect(page.locator("text=To Do").first()).toBeVisible();
    await expect(page.locator("text=In Progress").first()).toBeVisible();
    await expect(page.locator("text=In Review").first()).toBeVisible();
    await expect(page.locator("text=Done").first()).toBeVisible();

    // Click on a work item card to open drawer
    const firstCard = page.locator('[data-testid="work-item-card"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await expect(
        page
          .locator("text=Description")
          .or(page.locator("text=Activity & Comments"))
          .first(),
      ).toBeVisible({ timeout: 5000 });
      await page.keyboard.press("Escape");
    }
  });

  test("2. Verify Backlog Screen with Sprints & Backlog section", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/backlog");

    await expect(page.locator("h1:has-text('Backlog')")).toBeVisible();
    await expect(
      page.locator("text=Backlog Planning & Sprint Backlog"),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Create Sprint')"),
    ).toBeVisible();
    await expect(page.locator("text=Backlog").first()).toBeVisible();
  });

  test("3. Verify Squads / Teams Screen", async ({ page }) => {
    await page.goto("/client-apex/CTX/teams");

    await expect(page.locator("text=Engineering Teams").first()).toBeVisible();
    await expect(page.locator("text=Frontend Squad").first()).toBeVisible();
    await expect(page.locator("text=Backend Squad").first()).toBeVisible();
  });

  test("4. Verify Analytics & Burndown Screen", async ({ page }) => {
    await page.goto("/client-apex/CTX/metrics");

    await expect(
      page.locator("text=Sprint Burndown Chart").first(),
    ).toBeVisible();
    await expect(page.locator("text=Rolling Velocity").first()).toBeVisible();
  });

  test("5. Verify Quick Create Dialogs (Item, AI Story, Sprint)", async ({
    page,
  }) => {
    await page.goto("/");

    // Open Quick Create menu
    await page.click("button:has-text('Create')");
    await expect(page.locator("text=Quick Create")).toBeVisible();

    // 5a. Open Issue Dialog
    await page.click("text=Issue / Work Item");
    await expect(page.locator("text=Create Work Item")).toBeVisible();
    await page.click("button:has-text('Cancel')");

    // 5b. Open AI Story Modal
    await page.click("button:has-text('Create')");
    await page.click('[data-testid="action-ai-story"]');
    await expect(page.locator("text=Centraxis AI Story Agent")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("6. Verify Settings Hub - Profile Screen", async ({ page }) => {
    await page.goto("/settings/profile");
    await expect(
      page.locator("h1:has-text('Account & Profile')"),
    ).toBeVisible();
    await expect(page.locator("text=User Identity")).toBeVisible();
    await expect(
      page.locator("text=Microsoft Entra ID Authentication"),
    ).toBeVisible();
    await expect(page.locator("text=Connected & Active")).toBeVisible();
    await expect(
      page.locator("text=Transactional Email Notifications"),
    ).toBeVisible();
    await expect(
      page.locator("text=Sprint Kickoff Notifications"),
    ).toBeVisible();
  });

  test("7. Verify Settings Hub - Clients Screen & Client Creation", async ({
    page,
  }) => {
    await page.goto("/settings/clients");
    await expect(
      page.locator("h1:has-text('Clients & Multi-Tenancy')"),
    ).toBeVisible();
    await expect(page.locator("text=Client Apex")).toBeVisible();
    await expect(page.locator("text=Client Nexus")).toBeVisible();

    // Test creating a new client
    await page.click("button:has-text('Add Client')");
    await expect(
      page.locator("h2:has-text('Add Client Tenant')"),
    ).toBeVisible();

    const newClientName = `Beta Client ${Date.now()}`;
    await page.fill(
      'input[placeholder="e.g. Acme Corporation"]',
      newClientName,
    );
    await page.click("button[type='submit']:has-text('Create Client')");

    // Verify modal closes and new client card appears
    await expect(page.locator(`text=${newClientName}`)).toBeVisible({
      timeout: 5000,
    });
  });

  test("8. Verify Settings Hub - Workspace Members Screen", async ({
    page,
  }) => {
    await page.goto("/settings/members");
    await expect(
      page.locator("h1:has-text('Team Members & Access Management')"),
    ).toBeVisible();
    await expect(page.locator("text=Active Members")).toBeVisible();
    await expect(page.locator("text=Pending Invites")).toBeVisible();
    await expect(
      page.locator("text=System Administrator").first(),
    ).toBeVisible();

    // Test invite dialog trigger
    await page.click("button:has-text('+ Invite Member')");
    await expect(page.locator("text=Invite Team Members")).toBeVisible();
    await page.click("button:has-text('Cancel')");
  });
});
