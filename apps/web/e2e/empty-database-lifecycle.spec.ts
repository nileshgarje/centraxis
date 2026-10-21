import { test, expect, Page } from "@playwright/test";

test.describe.serial("Empty Database E2E Lifecycle", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("1. Login on empty DB auto-bootstraps initial admin and redirects to /admin", async () => {
    // Navigate to /login on empty DB
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill("admin@centvis.com");
    await passwordInput.fill("AdminPassword123!");
    await page.locator('button[type="submit"]').click();

    // With 0 clients in database, root resolver redirects SYSTEM_ADMIN to /admin
    await page.waitForURL((url) => url.pathname.includes("/admin"), { timeout: 20000 });

    // Verify Admin Dashboard & Empty State
    await expect(page.locator("text=Global System Administration").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Global Enterprise Administration").first()).toBeVisible();
    await expect(page.locator("text=No client workspaces configured yet").first()).toBeVisible();
    await expect(page.locator("text=Add First Client").first()).toBeVisible();
  });

  test("2. Create first Client Workspace via UI", async () => {
    await page.goto("/admin");
    await expect(page.locator("text=Global Enterprise Administration").first()).toBeVisible({ timeout: 10000 });

    // Open Add Client modal
    await page.click('button:has-text("Add First Client")');
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("dialog").locator("text=Add Client Tenant")).toBeVisible();

    // Fill Client details
    await page.fill('input#client-name', "Apex Innovations");
    await page.fill('input#client-slug', "apex-innovations");
    await page.fill('input#client-email', "contact@apexinnovations.com");

    // Submit dialog
    await page.click('button:has-text("Create Client")');

    // Verify modal closes and new Client Card appears
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Apex Innovations").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=apex-innovations").first()).toBeVisible();
    await expect(page.locator("text=0 Projects").first()).toBeVisible();
    await expect(page.locator('a:has-text("Enter Workspace")').first()).toBeVisible();
  });

  test("3. Enter Client Workspace and see empty project state", async () => {
    await page.goto("/apex-innovations");

    // Verify Client Workspace Home loads
    await expect(page.locator("text=Apex Innovations").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=apex-innovations").first()).toBeVisible();
    await expect(page.locator("text=Assigned Projects").first()).toBeVisible();

    // Verify Empty Project State
    await expect(page.locator("text=No projects assigned to this client yet").first()).toBeVisible();
    await expect(page.locator("button:has-text('Create First Project')").first()).toBeVisible();
  });

  test("4. Create first Project under Client via UI", async () => {
    await page.goto("/apex-innovations");
    await expect(page.locator("text=Apex Innovations").first()).toBeVisible({ timeout: 10000 });

    // Click Create First Project
    await page.click("button:has-text('Create First Project')");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("dialog").locator("text=Create New Project")).toBeVisible();

    // Fill Project Name, Key & Description
    await page.fill('input#project-name', "Core Platform");
    await page.fill('input#project-key', "ENG");
    await page.fill(
      'textarea#project-desc',
      "Next-generation core platform services and APIs",
    );

    // Submit dialog
    await page.click('button:has-text("Create Project")');

    // Verify modal closes and project card appears
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=ENG").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Core Platform").first()).toBeVisible();
    await expect(page.locator('a:has-text("Board")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Backlog")').first()).toBeVisible();
  });

  test("5. Navigate to Project Board with clean empty sprint state", async () => {
    await page.goto("/apex-innovations/ENG/board");

    // Verify project board layout
    await expect(page.locator("text=Core Platform").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=ENG").first()).toBeVisible();
    await expect(page.locator("button:has-text('Active Board')").first()).toBeVisible();
    await expect(page.locator("button:has-text('Backlog')").first()).toBeVisible();
  });

  test("6. Navigate to Project Backlog and verify empty backlog pool", async () => {
    await page.goto("/apex-innovations/ENG/backlog");

    // Verify backlog page
    await expect(page.locator("text=ENG").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Backlog')").first()).toBeVisible();
  });

  test("7. Client Settings page allows updating client profile", async () => {
    await page.goto("/apex-innovations/settings");

    // Verify Client Settings
    await expect(page.locator("text=Client Workspace Settings").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Client Profile & Identity").first()).toBeVisible();
    await expect(page.locator("#client-slug")).toHaveValue("apex-innovations");

    // Update Client Name
    const nameInput = page.locator("#client-name");
    await nameInput.fill("Apex Global Technologies");
    await page.click('button:has-text("Save Changes")');

    // Reload and verify updated name
    await page.reload();
    await expect(page.locator("#client-name")).toHaveValue("Apex Global Technologies", { timeout: 10000 });
  });
});
