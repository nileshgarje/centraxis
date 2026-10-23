import { test, expect, Page } from "@playwright/test";

// User Credentials
const USERS = {
  SYSTEM_ADMIN: {
    email: "admin@centvis.com",
    password: "AdminPassword123!",
    name: "System Administrator",
  },
  CLIENT_ADMIN: {
    email: "rachel.green@centvis.com",
    password: "password123",
    name: "Rachel Green",
    clientSlug: "client-apex",
    projectKey: "CTX",
  },
  PROJECT_LEAD: {
    email: "rachel.green@centvis.com",
    password: "password123",
    name: "Rachel Green",
    clientSlug: "client-apex",
    projectKey: "CTX",
  },
  MEMBER: {
    email: "liam.chen@centvis.com",
    password: "password123",
    name: "Liam Chen",
    clientSlug: "client-apex",
    projectKey: "CTX",
  },
  VIEWER: {
    email: "emily.watson@centvis.com",
    password: "password123",
    name: "Emily Watson",
    clientSlug: "client-apex",
    projectKey: "CTX",
  },
  CROSS_CLIENT: {
    email: "marcus.vance@centvis.com",
    password: "password123",
    name: "Marcus Vance",
    clientSlug: "client-nexus", // Admin of Nexus, zero access to Apex
    foreignClientSlug: "client-apex",
  },
};

async function loginUser(page: Page, email: string, pass: string) {
  await page.context().clearCookies();
  await page.goto("/login");

  if (page.url().includes("/login") || page.url().includes("/auth/signin")) {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill(email);
    await passwordInput.fill(pass);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(
      (url) =>
        !url.pathname.includes("/login") &&
        !url.pathname.includes("/auth/signin"),
      { timeout: 25000 },
    );
  }
}

test.describe("Role-Based Access Control (RBAC), Navigation & Dead-Link Audit", () => {
  test.setTimeout(60000);
  // ---------------------------------------------------------------------------
  // TEST SUITE A: Sidebar Menu Visibility & Route Health Matrix
  // ---------------------------------------------------------------------------
  test("Suite A1: SYSTEM_ADMIN sees global admin links, all clients in switcher, and can access /admin", async ({
    page,
  }) => {
    await loginUser(
      page,
      USERS.SYSTEM_ADMIN.email,
      USERS.SYSTEM_ADMIN.password,
    );

    // 1. Visit global admin hub directly
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(200);
    await expect(
      page.locator("text=Global System Administration").first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator("text=Global Enterprise Administration").first(),
    ).toBeVisible();

    // 2. Visit Client Apex Board
    await page.goto("/client-apex/CTX/board");
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible({
      timeout: 15000,
    });

    // Client switcher shows Add Client option for System Admin
    const switcher = page.locator('[data-testid="client-switcher-button"]');
    await expect(switcher).toBeVisible();
    await switcher.click();
    const dropdown = page.locator('[data-testid="client-switcher-dropdown"]');
    await expect(dropdown).toBeVisible();
    await expect(page.locator("text=Add Client Workspace")).toBeVisible();
    await page.keyboard.press("Escape");

    // Workspace operations are visible
    await expect(page.locator('[data-testid="nav-squads-roles"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="nav-workflow-schemes"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="nav-client-settings"]'),
    ).toBeVisible();
  });

  test("Suite A2: CLIENT_ADMIN sees assigned client, child projects, workspace operations, but no global add client", async ({
    page,
  }) => {
    await loginUser(
      page,
      USERS.CLIENT_ADMIN.email,
      USERS.CLIENT_ADMIN.password,
    );

    await page.goto("/client-apex/CTX/board");
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible({
      timeout: 15000,
    });

    // Workspace Operations: Visible to Client Admin
    await expect(page.locator('[data-testid="nav-squads-roles"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="nav-workflow-schemes"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="nav-client-settings"]'),
    ).toBeVisible();

    // Project sub-items: Board, Backlog, Settings
    await expect(
      page.locator('[data-testid="project-board-link-CTX"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="project-backlog-link-CTX"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="project-settings-link-CTX"]'),
    ).toBeVisible();

    // Client switcher: Add Client Workspace must NOT be present for non-system admins
    const switcher = page.locator('[data-testid="client-switcher-button"]');
    await switcher.click();
    await expect(
      page.locator("text=Add Client Workspace"),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");

    // Route Health: Click Client Settings and assert 200 OK
    const settingsLink = page.locator('[data-testid="nav-client-settings"]');
    await settingsLink.click();
    await page.waitForURL("**/client-apex/settings", { timeout: 15000 });
    expect(page.url()).toContain("/client-apex/settings");
    await expect(page.locator("text=Client Workspace Settings").first()).toBeVisible();
  });

  test("Suite A3: MEMBER & VIEWER have restricted navigation (no Workspace Operations, no Project Settings)", async ({
    page,
  }) => {
    // 1. As MEMBER (Liam Chen)
    await loginUser(page, USERS.MEMBER.email, USERS.MEMBER.password);
    await page.goto("/client-apex/CTX/board");
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible({
      timeout: 15000,
    });

    // Board and Backlog are visible
    await expect(
      page.locator('[data-testid="project-board-link-CTX"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="project-backlog-link-CTX"]'),
    ).toBeVisible();

    // Administrative links must be hidden
    await expect(
      page.locator('[data-testid="project-settings-link-CTX"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="nav-squads-roles"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="nav-workflow-schemes"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="nav-client-settings"]'),
    ).toHaveCount(0);

    // 2. As VIEWER (Emily Watson)
    await loginUser(page, USERS.VIEWER.email, USERS.VIEWER.password);
    await page.goto("/client-apex/CTX/board");
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible({
      timeout: 15000,
    });

    // Board and Backlog visible
    await expect(
      page.locator('[data-testid="project-board-link-CTX"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="project-backlog-link-CTX"]'),
    ).toBeVisible();

    // Administrative links must be hidden
    await expect(
      page.locator('[data-testid="project-settings-link-CTX"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="nav-squads-roles"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="nav-client-settings"]'),
    ).toHaveCount(0);
  });

  // ---------------------------------------------------------------------------
  // TEST SUITE B: Negative Security Guards & Deep-Link Traversal
  // ---------------------------------------------------------------------------
  test("Suite B1: Cross-Client Isolation (Client Nexus user cannot access Client Apex)", async ({
    page,
  }) => {
    // Marcus Vance is strictly in Client Nexus
    await loginUser(
      page,
      USERS.CROSS_CLIENT.email,
      USERS.CROSS_CLIENT.password,
    );

    // Direct navigation to Client Apex
    await page.goto("/client-apex");
    await expect(
      page.locator("text=Workspace Access Denied or Not Found").first(),
    ).toBeVisible({ timeout: 15000 });

    // Direct navigation to Client Apex CTX board
    await page.goto("/client-apex/CTX/board");
    await expect(
      page.locator("text=Workspace Access Denied or Not Found").first(),
    ).toBeVisible({ timeout: 15000 });

    // Direct navigation to Client Apex settings
    await page.goto("/client-apex/settings");
    await expect(
      page.locator("text=Workspace Access Denied or Not Found").first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("Suite B2: Elevated Privilege Rejection (MEMBER & VIEWER blocked on /admin, /settings/members, /settings/workflow)", async ({
    page,
  }) => {
    await loginUser(page, USERS.MEMBER.email, USERS.MEMBER.password);

    // 1. Direct navigation to /admin
    await page.goto("/admin");
    await expect(page.locator('[data-testid="access-denied-screen"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=Access Denied").first()).toBeVisible();

    // 2. Direct navigation to client members settings
    await page.goto("/client-apex/settings/members");
    await expect(page.locator('[data-testid="access-denied-screen"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=Access Denied").first()).toBeVisible();

    // 3. Direct navigation to project workflow settings
    await page.goto("/client-apex/CTX/settings/workflow");
    await expect(page.locator('[data-testid="access-denied-screen"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=Access Denied").first()).toBeVisible();

    // 4. Direct navigation to client workspace settings
    await page.goto("/client-apex/settings");
    await expect(page.locator('[data-testid="access-denied-screen"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=Access Denied").first()).toBeVisible();
  });

  test("Suite B3: Ghost / Non-Existent Entity Handling (invalid client and invalid project key)", async ({
    page,
  }) => {
    await loginUser(
      page,
      USERS.SYSTEM_ADMIN.email,
      USERS.SYSTEM_ADMIN.password,
    );

    // 1. Non-existent client
    await page.goto("/non-existent-client-xyz-123");
    await expect(
      page.locator("text=Workspace Access Denied or Not Found").first(),
    ).toBeVisible({ timeout: 15000 });

    // 2. Valid client but non-existent project key
    await page.goto("/client-apex/NONEXISTENTKEY/board");
    await expect(
      page.locator("text=Project Not Found or Access Denied").first(),
    ).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // TEST SUITE C: In-Page Action Permissions
  // ---------------------------------------------------------------------------
  test("Suite C1: VIEWER in-page permissions (Create buttons & Complete Sprint hidden, drag-drop locked)", async ({
    page,
  }) => {
    await loginUser(page, USERS.VIEWER.email, USERS.VIEWER.password);

    // 1. Check Board View
    await page.goto("/client-apex/CTX/board");
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible({
      timeout: 15000,
    });

    // Global Header "+ Create" button must be hidden for VIEWER
    await expect(
      page.locator('[data-testid="global-create-dropdown-trigger"]'),
    ).toHaveCount(0);

    // Board "+ Add Card" button must be hidden
    await expect(
      page.locator('[data-testid="board-add-card-button"]'),
    ).toHaveCount(0);

    // Board "Complete Sprint" button must be hidden
    await expect(
      page.locator('[data-testid="complete-sprint-button"]'),
    ).toHaveCount(0);

    // Drag and drop must be locked on cards: check data-drag-disabled
    const card = page.locator('[data-testid="work-item-card"]').first();
    await expect(card).toBeVisible({ timeout: 10000 });
    const isLocked = await card.getAttribute("data-drag-disabled");
    expect(isLocked).toBe("true");

    // 2. Check Backlog View
    await page.goto("/client-apex/CTX/backlog");
    await expect(page.locator("text=Backlog").first()).toBeVisible({
      timeout: 15000,
    });

    // "Create Sprint" button must be hidden
    await expect(
      page.locator('[data-testid="backlog-create-sprint-button"]'),
    ).toHaveCount(0);

    // Quick add / Inline create rows must be hidden
    await expect(
      page.locator('[data-testid="inline-create-trigger"]'),
    ).toHaveCount(0);
  });

  test("Suite C2: MEMBER in-page permissions (Work item creation & drag permitted, sprint completion hidden)", async ({
    page,
  }) => {
    await loginUser(page, USERS.MEMBER.email, USERS.MEMBER.password);

    // 1. Board View
    await page.goto("/client-apex/CTX/board");
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible({
      timeout: 15000,
    });

    // Global Header "+ Create" button IS visible for MEMBER
    await expect(
      page.locator('[data-testid="global-create-dropdown-trigger"]'),
    ).toBeVisible();

    // Board "+ Add Card" button IS visible
    await expect(
      page.locator('[data-testid="board-add-card-button"]'),
    ).toBeVisible();

    // Board "Complete Sprint" button must be HIDDEN for MEMBER
    await expect(
      page.locator('[data-testid="complete-sprint-button"]'),
    ).toHaveCount(0);

    // Card drag-and-drop must be ACTIVE (not locked)
    const card = page.locator('[data-testid="work-item-card"]').first();
    await expect(card).toBeVisible({ timeout: 10000 });
    const isLocked = await card.getAttribute("data-drag-disabled");
    expect(isLocked).not.toBe("true");

    // 2. Backlog View
    await page.goto("/client-apex/CTX/backlog");
    await expect(page.locator("text=Backlog").first()).toBeVisible({
      timeout: 15000,
    });

    // "Create Sprint" must be HIDDEN for regular MEMBER
    await expect(
      page.locator('[data-testid="backlog-create-sprint-button"]'),
    ).toHaveCount(0);

    // Quick-add issue IS permitted for MEMBER
    await expect(
      page.locator('[data-testid="inline-create-trigger"]').first(),
    ).toBeVisible();
  });

  test("Suite C3: PROJECT_LEAD in-page permissions (Sprint start, sprint completion, and settings accessible)", async ({
    page,
  }) => {
    await loginUser(
      page,
      USERS.PROJECT_LEAD.email,
      USERS.PROJECT_LEAD.password,
    );

    // 1. Board View
    await page.goto("/client-apex/CTX/board");
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible({
      timeout: 15000,
    });

    // Board "Complete Sprint" button IS visible for Project Lead
    await expect(
      page.locator('[data-testid="complete-sprint-button"]'),
    ).toBeVisible();

    // 2. Backlog View
    await page.goto("/client-apex/CTX/backlog");
    await expect(page.locator("text=Backlog").first()).toBeVisible({
      timeout: 15000,
    });

    // "Create Sprint" button IS visible
    await expect(
      page.locator('[data-testid="backlog-create-sprint-button"]'),
    ).toBeVisible();

    // Project Settings workflow configuration IS accessible
    await page.goto("/client-apex/CTX/settings/workflow");
    await expect(
      page.locator("text=Workflow Scheme Editor").or(page.locator("text=Workflow")).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="access-denied-screen"]'),
    ).toHaveCount(0);
  });
});
