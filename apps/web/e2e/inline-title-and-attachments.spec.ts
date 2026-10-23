import { test, expect } from "@playwright/test";

test.describe("Work Item Title Inline-Edit Highlighting & Rich File Attachments", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    if (page.url().includes("/login") || page.url().includes("/auth/signin")) {
      await page.locator('input[type="email"]').fill("alex.morgan@centvis.com");
      await page.locator('input[type="password"]').fill("password123");
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(
        (url) =>
          !url.pathname.includes("/login") &&
          !url.pathname.includes("/auth/signin"),
        { timeout: 15000 },
      );
    }
  });

  test("1. Title inline-edit: visual highlighting, keyboard actions (Escape to cancel, Enter to save)", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="work-item-card"]', {
      timeout: 15000,
    });

    // Open work item drawer for CTX-1
    await page.locator('[data-item-key="CTX-1"]').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    const drawer = page.locator('[role="dialog"]');
    const titleEditor = drawer.locator('[data-testid="inline-title-editor"]');
    await expect(titleEditor).toBeVisible();

    const titleInput = drawer.locator('[data-testid="inline-title-input"]');
    await expect(titleInput).toBeVisible();
    const originalTitle = (await titleInput.inputValue()).trim();

    // Hover shows edit affordance
    await titleEditor.hover();
    const pencilIcon = titleEditor.locator("svg");
    await expect(pencilIcon).toBeVisible();

    // Click to enter edit mode
    await titleInput.click();

    // Verify active editing input and styling
    await expect(titleInput).toHaveClass(/ring-2/);
    await expect(titleInput).toHaveClass(/ring-primary/);

    // Verify helper badge
    await expect(drawer.getByText("Enter ↵")).toBeVisible();
    await expect(drawer.getByText("Esc", { exact: true })).toBeVisible();
    await expect(drawer.getByText("to discard")).toBeVisible();

    // 1A. Test Escape reverts without saving
    await titleInput.fill("Temporary Discarded Title");
    await page.keyboard.press("Escape");

    // Edit mode should be closed (helper badge hidden) and title should remain original
    await expect(drawer.getByText("Enter ↵")).not.toBeVisible();
    await expect(titleInput).not.toHaveClass(/ring-2/);
    expect(await titleInput.inputValue()).toBe(originalTitle);

    // 1B. Test Enter commits changes
    await titleInput.click();
    await expect(drawer.getByText("Enter ↵")).toBeVisible();
    await expect(titleInput).toHaveClass(/ring-2/);

    const updatedTitle = `Updated Core Auth ${Date.now().toString().slice(-4)}`;
    await titleInput.fill(updatedTitle);
    await page.keyboard.press("Enter");

    // Edit mode should close and new title is displayed
    await expect(drawer.getByText("Enter ↵")).not.toBeVisible();
    await expect(titleInput).not.toHaveClass(/ring-2/);
    expect(await titleInput.inputValue()).toBe(updatedTitle);

    // Verify persistence after drawer close & reopen
    await drawer.getByRole("button", { name: "Close" }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Card on board should reflect the new title
    await expect(
      page.locator('[data-item-key="CTX-1"]').first(),
    ).toContainText(updatedTitle);

    // Reopen drawer
    await page.locator('[data-item-key="CTX-1"]').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await expect(
      page.locator('[role="dialog"]').locator('[data-testid="inline-title-input"]'),
    ).toHaveValue(updatedTitle);
  });

  test("2. Attachments section: file upload, gallery grid, lightbox preview, and deletion", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="work-item-card"]', {
      timeout: 15000,
    });

    await page.locator('[data-item-key="CTX-1"]').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    const drawer = page.locator('[role="dialog"]');
    const attachmentsSection = drawer.locator('[data-testid="attachments-section"]');
    await expect(attachmentsSection).toBeVisible();

    // Upload an image attachment via file input
    const fileChooserPromise = page.waitForEvent("filechooser");
    await drawer.locator('[data-testid="attach-file-btn"]').click();
    const fileChooser = await fileChooserPromise;

    // Create a 1x1 png buffer for test upload
    const testFileName = `shot-${Date.now().toString().slice(-6)}.png`;
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );

    await fileChooser.setFiles({
      name: testFileName,
      mimeType: "image/png",
      buffer: pngBuffer,
    });

    // Wait for attachment card to appear in gallery
    const uploadedCard = attachmentsSection.locator(`text=${testFileName}`).first();
    await expect(uploadedCard).toBeVisible({ timeout: 15000 });

    // Verify image preview in lightbox
    const thumbImg = attachmentsSection.locator(`img[alt="${testFileName}"]`).first();
    await expect(thumbImg).toBeVisible();
    await thumbImg.click();

    // Verify Lightbox Modal opened
    const lightboxModal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(lightboxModal).toBeVisible();
    await expect(lightboxModal.getByText(testFileName)).toBeVisible();
    await expect(lightboxModal.getByRole("link", { name: "Download" })).toBeVisible();

    // Close lightbox
    await lightboxModal.getByRole("button", { name: "Close preview" }).click();
    await expect(lightboxModal).not.toBeVisible();

    // Delete attachment
    const cardContainer = attachmentsSection.locator(`[data-testid^="attachment-card-"]`).filter({ hasText: testFileName }).first();
    const deleteBtn = cardContainer.locator("button[title='Delete attachment']");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Verify removed from gallery
    await expect(uploadedCard).not.toBeVisible({ timeout: 10000 });
  });

  test("3. Full-View Page (/client-apex/CTX-1): Title inline-editing and attachments section render cleanly", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX-1");
    await page.waitForSelector('[data-testid="inline-title-editor"]', {
      timeout: 15000,
    });

    // Verify title editor on full page view
    const titleEditor = page.locator('[data-testid="inline-title-editor"]');
    await expect(titleEditor).toBeVisible();

    // Verify attachments section on full page view
    const attachmentsSection = page.locator('[data-testid="attachments-section"]');
    await expect(attachmentsSection).toBeVisible();
    await expect(attachmentsSection.getByText("Attachments (")).toBeVisible();
  });
});
