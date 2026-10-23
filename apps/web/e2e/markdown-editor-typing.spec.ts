import { test, expect } from "@playwright/test";

test.describe("Markdown Editor Fast-Typing & Autosave Race Condition Fix", () => {
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

  test("1. Fast typing in WorkItemDrawer records every keystroke without drops or caret reset", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="work-item-card"]', {
      timeout: 15000,
    });

    // Open work item drawer
    await page.locator('[data-item-key="CTX-1"]').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    const drawer = page.locator('[role="dialog"]');
    // First ProseMirror editor in the drawer is the Description editor
    const descEditor = drawer.locator(".ProseMirror").first();
    await expect(descEditor).toBeVisible();

    // Click to focus and select all existing content to replace
    await descEditor.click();
    await page.keyboard.press("ControlOrMeta+A");

    // Fast-type 30+ words rapidly without pausing
    const testSentence =
      "Centraxis markdown editor typing test verifying that every single keystroke is captured reliably without stutter dropped letters or caret jumping back to the beginning of the block.";

    await descEditor.pressSequentially(testSentence, { delay: 5 });

    // Verify all text was recorded accurately mid-typing / immediately after typing
    const editorText = await descEditor.innerText();
    expect(editorText.trim()).toBe(testSentence);

    // Wait 1.5s for debounced autosave to trigger cleanly
    await page.waitForTimeout(1600);

    // Click outside / blur the editor to flush
    await drawer.locator("text=Description").first().click();
    await page.waitForTimeout(500);

    // Close drawer and reopen to verify persistence
    await drawer.getByRole("button", { name: "Close" }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    await page.locator('[data-item-key="CTX-1"]').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    const reopenedEditor = page.locator('[role="dialog"]').locator(".ProseMirror").first();
    await expect(reopenedEditor).toBeVisible();
    const persistedText = await reopenedEditor.innerText();
    expect(persistedText.trim()).toBe(testSentence);
  });

  test("2. Fast typing in Full-View page (/client-apex/CTX-1) preserves all keystrokes and persists", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX-1");
    await page.waitForSelector(".ProseMirror", { timeout: 15000 });

    const descEditor = page.locator(".ProseMirror").first();
    await expect(descEditor).toBeVisible();

    await descEditor.click();
    await page.keyboard.press("ControlOrMeta+A");

    const fullViewSentence =
      "Full page view markdown test ensuring uncontrolled decoupling and isolated TRPC cache invalidation works as expected across multiple sentences and paragraphs.";

    await descEditor.pressSequentially(fullViewSentence, { delay: 5 });

    const editorText = await descEditor.innerText();
    expect(editorText.trim()).toBe(fullViewSentence);

    // Wait for debounced autosave & blur
    await page.waitForTimeout(1600);
    await page.getByText("Description", { exact: true }).click();
    await page.waitForTimeout(500);

    // Reload page to verify backend persistence
    await page.reload();
    await page.waitForSelector(".ProseMirror", { timeout: 15000 });

    const reloadedEditor = page.locator(".ProseMirror").first();
    const reloadedText = await reloadedEditor.innerText();
    expect(reloadedText.trim()).toBe(fullViewSentence);
  });
});
