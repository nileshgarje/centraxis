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
    { timeout: 15000 },
  );
}

test.describe("Multi-Client/Multi-Project RBAC Matrix & Assignee Isolation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("1. Settings: Members table displays Client & Project badges and Edit Access modal works", async ({
    page,
  }) => {
    await page.goto("/settings/members");
    await expect(
      page.locator("text=Team Members & Access Management"),
    ).toBeVisible({ timeout: 10000 });

    // Verify column header
    await expect(page.locator("text=Client & Project Access")).toBeVisible();

    // Verify that client and project badges are rendered in table
    await expect(page.locator("text=Client Apex").first()).toBeVisible();
    await expect(page.locator("text=[CTX]").first()).toBeVisible();

    // Click "Access" button on a member
    const accessBtn = page.locator('button:has-text("Access")').first();
    await expect(accessBtn).toBeVisible();
    await accessBtn.click();

    // Verify "Edit User Access Matrix" dialog opens
    await expect(page.locator("text=Edit User Access Matrix")).toBeVisible();
    await expect(page.locator("text=Global RBAC Role")).toBeVisible();
    await expect(page.locator("text=Client Allocations")).toBeVisible();
    await expect(
      page.locator("text=Project Memberships & Scoped Roles"),
    ).toBeVisible();

    // Close the dialog
    await page.click('button:has-text("Cancel")');
    await expect(
      page.locator("text=Edit User Access Matrix"),
    ).not.toBeVisible();
  });

  test("2. Strict Assignee Scoping: Project 1 only shows associated members in Assignee select", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/board");
    await expect(page.locator("text=CTX").first()).toBeVisible({
      timeout: 10000,
    });

    // Open Create Item Dialog via Create dropdown
    await page.click('button:has-text("Create")');
    await page.click("text=Issue / Work Item");

    // Wait for dialog
    await expect(page.locator("text=Create Work Item")).toBeVisible();

    // Open Assignee dropdown
    const assigneeTrigger = page.locator("#item-assignee");
    await expect(assigneeTrigger).toBeVisible();
    await assigneeTrigger.click();

    // Project 1 (Centraxis Core): Liam Chen is a member
    await expect(
      page.locator('[role="option"]:has-text("Liam Chen")'),
    ).toBeVisible();

    // Olivia Patel is a cross-project member
    await expect(
      page.locator('[role="option"]:has-text("Olivia Patel")'),
    ).toBeVisible();

    // Lucas Silva belongs strictly to Project 2 (Mobile App) -> Must NOT be present
    await expect(
      page.locator('[role="option"]:has-text("Lucas Silva")'),
    ).toHaveCount(0);

    // Close select and dialog
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  });

  test("3. Backend Security: API rejects assigning unassociated user to project", async ({
    page,
    request,
  }) => {
    // Navigate to ensure session
    await page.goto("/");

    // Extract cookies from page context
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Fetch project and user IDs via tRPC
    const projectsRes = await request.get("/api/trpc/project.list", {
      headers: { cookie: cookieHeader },
    });
    expect(projectsRes.ok()).toBeTruthy();
    const projectsData = await projectsRes.json();
    const coreProject = projectsData.result.data.json.find(
      (p: any) => p.key === "CTX",
    );
    expect(coreProject).toBeDefined();

    // Fetch members to find Lucas Silva (Mobile App only)
    const membersRes = await request.get("/api/trpc/org.listMembers", {
      headers: { cookie: cookieHeader },
    });
    expect(membersRes.ok()).toBeTruthy();
    const membersData = await membersRes.json();
    const lucas = membersData.result.data.json.find(
      (m: any) => m.name === "Lucas Silva",
    );
    expect(lucas).toBeDefined();

    // Attempt to tamper/create an issue in Core Project assigned to Lucas Silva
    const tamperRes = await request.post("/api/trpc/backlog.createItem", {
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      data: {
        json: {
          projectId: coreProject.id,
          title: "Malicious Cross-Tenant Assignment Attempt",
          assigneeId: lucas.id,
          type: "STORY",
          priority: "MEDIUM",
          status: "BACKLOG",
        },
      },
    });

    // Must be rejected with BAD_REQUEST
    expect(tamperRes.status()).toBe(400);
    const resText = await tamperRes.text();
    expect(resText).toContain(
      "Selected user is not a member of this project or client",
    );
  });
});
