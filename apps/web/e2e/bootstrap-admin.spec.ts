import { test, expect } from "@playwright/test";

test.describe("Keycloak KC_BOOTSTRAP_ADMIN Temporary Admin Feature", () => {
  test("Bootstrapped admin is flagged with temporary user badge and security banner", async ({ page }) => {
    // Navigate to login
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"], input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill("admin@centvis.com");
    await passwordInput.fill("AdminPassword123!");
    await page.locator('button[type="submit"]').click();

    // Wait for landing page after login
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });

    // 1. Verify Temporary Admin badge in Header
    await expect(page.locator("text=Temporary Admin").first()).toBeVisible({ timeout: 10000 });

    // 2. Go to /admin and verify KC_BOOTSTRAP_ADMIN Security Callout and Temporary User badge
    await page.goto("/admin");
    await expect(page.locator("text=Temporary User").first()).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("text=Signed in with Temporary Bootstrap Administrator").first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=KC_BOOTSTRAP_ADMIN").first()).toBeVisible();
    await expect(page.locator('a:has-text("Create Permanent Admin")').first()).toBeVisible();

    // 3. Verify Temporary badge on Settings > Members page
    await page.goto("/settings/members");
    await expect(page.locator("text=Team Members & Access Management").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Temporary").first()).toBeVisible({ timeout: 10000 });
  });
});
