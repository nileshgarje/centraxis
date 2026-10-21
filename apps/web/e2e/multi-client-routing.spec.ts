import { test, expect, Page } from "@playwright/test";

async function loginAndNavigate(
  page: Page,
  targetUrl: string,
  email: string = "admin@centvis.com",
  pass: string = "AdminPassword123!",
) {
  await page.context().clearCookies();
  await page.goto(targetUrl);

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);
  await passwordInput.fill(pass);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL(
    (url) =>
      !url.pathname.includes("/login") &&
      !url.pathname.includes("/auth/signin"),
    { timeout: 20000 },
  );
}

test.describe("Path-Based Multi-Client Routing (/[clientSlug]/...)", () => {
  test("1. Root redirect and client workspace home (/[clientSlug])", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/client-apex");

    await expect(page.locator("text=Client Apex").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=client-apex").first()).toBeVisible();
    await expect(page.locator("text=Assigned Projects").first()).toBeVisible();

    // Verify project card with key CTX exists
    await expect(page.locator("text=CTX").first()).toBeVisible();
    await expect(page.locator('a:has-text("Board")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Backlog")').first()).toBeVisible();
  });

  test("2. Project Sprint Board routing (/[clientSlug]/[projectKey]/board)", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/client-apex/CTX/board");

    // Verify active project and board are loaded
    await expect(page.locator("text=Centraxis Core").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=CTX").first()).toBeVisible();
    await expect(
      page.locator("button:has-text('Active Board')").first(),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Backlog')").first(),
    ).toBeVisible();
  });

  test("3. Project Backlog routing (/[clientSlug]/[projectKey]/backlog)", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/client-apex/CTX/backlog");

    await expect(page.locator("text=CTX").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("button:has-text('Backlog')").first(),
    ).toBeVisible();
  });

  test("4. Client Settings routing (/[clientSlug]/settings)", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/client-apex/settings");

    await expect(
      page.locator("text=Client Workspace Settings").first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("text=Client Profile & Identity").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=Client Members & Scoped Roles").first(),
    ).toBeVisible();
    await expect(page.locator("#client-slug")).toHaveValue("client-apex");
  });

  test("5. Cross-Client Isolation: Mismatched project key returns Project Not Found", async ({
    page,
  }) => {
    // Project CTX belongs to client-apex, NOT client-nexus
    await loginAndNavigate(page, "/client-nexus/CTX/board");

    await expect(
      page.locator("text=Project Not Found or Access Denied").first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("text=Back to Client Workspace").first(),
    ).toBeVisible();
  });

  test("6. Access Control: Member of Client Apex cannot access Client Nexus", async ({
    page,
  }) => {
    // Liam Chen is only assigned to client-apex
    await loginAndNavigate(
      page,
      "/client-apex",
      "liam.chen@centvis.com",
      "AdminPassword123!",
    );
    await expect(page.locator("text=Client Apex").first()).toBeVisible({
      timeout: 10000,
    });

    // Liam attempting to access client-nexus should be denied
    await page.goto("/client-nexus");
    await expect(page.locator("text=Access Denied").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("7. Global Admin Hub (/admin) accessible for SYSTEM_ADMIN", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/admin");

    await expect(
      page.locator("text=Global System Administration").first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("text=Global Enterprise Administration").first(),
    ).toBeVisible();
    await expect(page.locator("text=Client Apex").first()).toBeVisible();
    await expect(page.locator("text=Client Nexus").first()).toBeVisible();
    await expect(
      page.locator("text=Manage Users & Roles").first(),
    ).toBeVisible();
  });
});
