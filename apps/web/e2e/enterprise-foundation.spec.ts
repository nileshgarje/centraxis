import { test, expect, Page } from "@playwright/test";

async function authenticateAsAdmin(page: Page) {
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

test.describe("Enterprise Foundation E2E Flow", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsAdmin(page);
  });

  test("should display 2-level multi-client hierarchy in project switcher dropdown", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("text=Centraxis")).toBeVisible();

    // Open project switcher
    const projectSwitcherBtn = page
      .locator(
        "button:has-text('Select Project'), button:has-text('Centraxis')",
      )
      .first();
    await projectSwitcherBtn.click();

    // Verify 2-level dropdown header & client spaces
    await expect(page.locator("text=Clients & Projects")).toBeVisible();
    await expect(page.locator("text=Client Apex")).toBeVisible();
    await expect(page.locator("text=Client Nexus")).toBeVisible();

    // Verify action triggers for + Project and + Client
    await expect(page.locator("button:has-text('+ Client')")).toBeVisible();
    await expect(page.locator("button:has-text('+ Project')")).toBeVisible();
  });

  test("should render user avatar menu with Entra ID SSO badge and settings links", async ({
    page,
  }) => {
    await page.goto("/");

    // Locate the user profile avatar button in the header
    const avatarBtn = page.locator("header button:has(span)").last();
    await avatarBtn.click();

    // Check user info and Entra ID SSO status badge
    await expect(page.getByText("Entra ID SSO", { exact: true })).toBeVisible();
    await expect(page.locator("text=admin@centvis.com")).toBeVisible();

    // Verify Settings navigation links
    await expect(page.locator("text=Account & Profile")).toBeVisible();
    await expect(page.locator("text=Clients & Tenancy")).toBeVisible();
    await expect(page.locator("text=Workspace Members")).toBeVisible();
    await expect(page.locator("text=Sign out")).toBeVisible();
  });

  test("should navigate Settings Hub across Profile, Clients, and Members", async ({
    page,
  }) => {
    // 1. Profile Settings
    await page.goto("/settings/profile");
    await expect(
      page.locator("h1:has-text('Account & Profile')"),
    ).toBeVisible();
    await expect(
      page.locator("text=Microsoft Entra ID Authentication"),
    ).toBeVisible();
    await expect(
      page.locator("text=Transactional Email Notifications"),
    ).toBeVisible();

    // 2. Clients & Tenancy Settings
    await page.click("text=Clients & Tenancy");
    await expect(
      page.locator("h1:has-text('Clients & Multi-Tenancy')"),
    ).toBeVisible();
    await expect(page.locator("text=Client Apex")).toBeVisible();
    await expect(page.locator("text=Client Nexus")).toBeVisible();

    // 3. Workspace Members Settings
    await page.click("text=Workspace Members");
    await expect(
      page.locator("h1:has-text('Team Members & Access Management')"),
    ).toBeVisible();
    await expect(page.locator("text=Active Members")).toBeVisible();
  });
});
