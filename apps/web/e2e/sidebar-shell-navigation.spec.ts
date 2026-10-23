import { test, expect } from "@playwright/test";

test.describe("shadcn/ui Sidebar-07 Shell & Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    if (page.url().includes("/login") || page.url().includes("/auth/signin")) {
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      await expect(emailInput).toBeVisible({ timeout: 10000 });
      await emailInput.fill("alex.morgan@centvis.com");
      await passwordInput.fill("password123");
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(
        (url) =>
          !url.pathname.includes("/login") &&
          !url.pathname.includes("/auth/signin"),
        { timeout: 20000 },
      );
    }
  });

  test("1. Sidebar shell mounts correctly with client switcher, project tree, personal hub, and user profile", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="app-sidebar"]', {
      timeout: 15000,
    });

    // 1. Verify Sidebar container and header
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible();

    // 2. Client Switcher Header
    const clientSwitcherBtn = page.locator('[data-testid="client-switcher-button"]');
    await expect(clientSwitcherBtn).toBeVisible();
    await expect(clientSwitcherBtn).toContainText("Client Apex");

    // Click client switcher to open dropdown
    await clientSwitcherBtn.click();
    const clientDropdown = page.locator('[data-testid="client-switcher-dropdown"]');
    await expect(clientDropdown).toBeVisible();

    // Verify other client items exist
    const clientItems = page.locator('[data-testid^="client-switcher-item-"]');
    const clientCount = await clientItems.count();
    expect(clientCount).toBeGreaterThan(0);

    // Close dropdown with Escape
    await page.keyboard.press("Escape");

    // 3. Personal Hub: My Work link
    const myWorkLink = page.locator('[data-testid="nav-my-work"]');
    await expect(myWorkLink).toBeVisible();
    await expect(myWorkLink).toContainText("My Work");

    // 4. Project Tree Navigation: CTX project
    const ctxTrigger = page.locator('[data-testid="project-trigger-CTX"]');
    await expect(ctxTrigger).toBeVisible();
    await expect(ctxTrigger).toContainText("CTX");

    const boardLink = page.locator('[data-testid="project-board-link-CTX"]');
    const backlogLink = page.locator('[data-testid="project-backlog-link-CTX"]');
    const settingsLink = page.locator('[data-testid="project-settings-link-CTX"]');

    await expect(boardLink).toBeVisible();
    await expect(backlogLink).toBeVisible();
    await expect(settingsLink).toBeVisible();

    // 5. Workspace Operations
    await expect(page.locator('[data-testid="nav-squads-roles"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-workflow-schemes"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-client-settings"]')).toBeVisible();

    // 6. User Profile Footer
    const userProfileBtn = page.locator('[data-testid="user-profile-button"]');
    await expect(userProfileBtn).toBeVisible();
    await expect(userProfileBtn).toContainText("Alex Morgan");

    // Open User Profile Menu
    await userProfileBtn.click();
    const userDropdown = page.locator('[data-testid="user-profile-dropdown"]');
    await expect(userDropdown).toBeVisible();
    await expect(page.locator('[data-testid="user-profile-logout"]')).toBeVisible();
    await page.keyboard.press("Escape");

    // 7. Streamlined Canvas Header
    const canvasHeader = page.locator('[data-testid="canvas-header"]');
    await expect(canvasHeader).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-trigger"]')).toBeVisible();
    await expect(page.locator('[data-testid="command-search-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="global-create-dropdown-trigger"]')).toBeVisible();
  });

  test("2. Navigating between Board, Backlog, and Project Views updates active route seamlessly", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="app-sidebar"]', {
      timeout: 15000,
    });

    // Navigate to Backlog from sidebar
    const backlogLink = page.locator('[data-testid="project-backlog-link-CTX"]');
    await backlogLink.click();
    await page.waitForURL("**/client-apex/CTX/backlog", { timeout: 25000 });
    expect(page.url()).toContain("/client-apex/CTX/backlog");

    // Check Backlog UI is active
    await expect(page.locator("text=Backlog").first()).toBeVisible({ timeout: 15000 });

    // Navigate back to Board from sidebar
    const boardLink = page.locator('[data-testid="project-board-link-CTX"]');
    await boardLink.click();
    await page.waitForURL("**/client-apex/CTX/board", { timeout: 25000 });
    expect(page.url()).toContain("/client-apex/CTX/board");
  });

  test("3. Sidebar collapsible trigger toggles sidebar state", async ({ page }) => {
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="app-sidebar"]', {
      timeout: 15000,
    });

    const trigger = page.locator('[data-testid="sidebar-trigger"]');
    await expect(trigger).toBeVisible();

    // Toggle sidebar collapse
    await trigger.click();
    await page.waitForTimeout(300);

    // Toggle again to expand
    await trigger.click();
    await page.waitForTimeout(300);
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible();
  });

  test("4. Global Create Dropdown opens actions modal / dialogs", async ({ page }) => {
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="app-sidebar"]', {
      timeout: 15000,
    });

    const createBtn = page.locator('[data-testid="global-create-dropdown-trigger"]');
    await createBtn.click();

    const createContent = page.locator('[data-testid="global-create-dropdown-content"]');
    await expect(createContent).toBeVisible();
    await expect(page.locator("text=Work Item").first()).toBeVisible();

    // Click Work Item to trigger dialog
    await page.locator("text=Work Item").first().click();
    await page.waitForSelector('role=dialog', { timeout: 5000 });
    await expect(page.locator('role=dialog')).toBeVisible();
  });
});
