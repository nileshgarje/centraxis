import { test, expect } from "@playwright/test";

test.describe("Client Creation & Organization Resolution", () => {
  test("Successfully creates a new client workspace without foreign key errors", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const clientName = `Horizon Enterprises ${timestamp}`;
    const clientSlug = `horizon-${timestamp}`;

    // 1. Login as Admin
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"], input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill("admin@centvis.com");
    await passwordInput.fill("AdminPassword123!");
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 20000,
    });

    // 2. Navigate to /admin
    await page.goto("/admin");
    await expect(
      page.locator("text=Global Enterprise Administration").first(),
    ).toBeVisible({ timeout: 10000 });

    // 3. Open Add Client Tenant Dialog
    const addClientBtn = page.locator('button:has-text("Add Client Tenant")');
    await expect(addClientBtn).toBeVisible({ timeout: 10000 });
    await addClientBtn.click();

    // 4. Fill Create Client Form
    const nameInput = page.locator('input#client-name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(clientName);

    const slugInput = page.locator('input#client-slug');
    await slugInput.fill(clientSlug);

    const emailField = page.locator('input#client-email');
    await emailField.fill(`contact@${clientSlug}.com`);

    // 5. Submit Form
    const submitBtn = page.locator('button[type="submit"]:has-text("Create Client")');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // 6. Verify client appears in admin clients list
    await expect(page.locator(`text=${clientName}`).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(`text=${clientSlug}`).first()).toBeVisible();

    // 7. Navigate directly to new client workspace
    await page.goto(`/${clientSlug}`);
    await expect(page.locator(`text=${clientName}`).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
