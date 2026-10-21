import { test, expect, Page } from "@playwright/test";

test.describe.serial("Sub-Tasks Management & @Mentions System with Notifications", () => {
  let page: Page;
  const storyTitle = `Parent Story ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("1. Login and ensure Client and Project exist", async () => {
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"], input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill("admin@centvis.com");
    await passwordInput.fill("AdminPassword123!");
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });

    // Navigate to client workspace
    await page.goto("/apex-innovations");
    await expect(page.locator("text=apex-innovations").first()).toBeVisible({ timeout: 10000 });
  });

  test("2. Open Project Backlog and Create a Parent Story", async () => {
    await page.goto("/apex-innovations/ENG/backlog");
    await expect(page.locator("button:has-text('Backlog')").first()).toBeVisible({ timeout: 10000 });

    // Open Create Item Dialog using the Header Create button
    await page.click('button:has-text("Create")');
    await page.click('text=Issue / Work Item');

    // Fill Title
    const titleInput = page.locator('input#item-title');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(storyTitle);

    // Submit Work Item
    await page.click('button:has-text("Create Item")');

    // Verify item created in backlog list
    await expect(page.locator(`text=${storyTitle}`).first()).toBeVisible({ timeout: 10000 });
  });

  test("3. Open Work Item Drawer and Manage Sub-Tasks", async () => {
    // Click on the newly created story to open drawer
    await page.click(`text=${storyTitle}`);

    // Verify Drawer is open
    await expect(page.locator("text=Sub-Tasks & Checklist").first()).toBeVisible({ timeout: 10000 });

    // Verify initial 0/0 progress
    await expect(page.locator("text=0/0 Done (0%)").first()).toBeVisible();

    // Quick-Add Subtask 1
    const subtaskInput = page.locator('input[placeholder="+ Add a subtask (press Enter)..."]');
    await subtaskInput.fill("Implement DB schema and Prisma relations");
    await subtaskInput.press("Enter");

    await expect(page.locator("text=Implement DB schema and Prisma relations").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=0/1 Done (0%)").first()).toBeVisible();

    // Quick-Add Subtask 2
    await subtaskInput.fill("Develop API routes and tRPC routers");
    await subtaskInput.press("Enter");

    await expect(page.locator("text=Develop API routes and tRPC routers").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=0/2 Done (0%)").first()).toBeVisible();

    // Toggle Subtask 1 Checkbox to DONE
    const firstCheckbox = page.locator('button[title="Mark as Done"]').first();
    await firstCheckbox.click();

    // Verify progress bar roll-up: 1/2 Done (50%)
    await expect(page.locator("text=1/2 Done (50%)").first()).toBeVisible({ timeout: 10000 });
  });

  test("4. Quality Gate: Prevent marking parent story as DONE while sub-tasks remain incomplete", async () => {
    // Find status trigger button inside the sheet header
    const statusSelectTrigger = page.locator('div[role="dialog"] button[role="combobox"]').first();
    await statusSelectTrigger.click();

    // Click "Done" status option
    await page.click('div[role="option"]:has-text("Done")');

    // Verify Quality Gate error banner appears
    await expect(
      page.locator("text=Cannot resolve work item while child sub-tasks are incomplete").first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("5. Complete remaining sub-task and successfully close parent story", async () => {
    // Mark second subtask as Done
    const secondCheckbox = page.locator('button[title="Mark as Done"]').first();
    await secondCheckbox.click();

    // Verify progress bar: 2/2 Done (100%)
    await expect(page.locator("text=2/2 Done (100%)").first()).toBeVisible({ timeout: 10000 });

    // Now change status to DONE
    const statusSelectTrigger = page.locator('div[role="dialog"] button[role="combobox"]').first();
    await statusSelectTrigger.click();
    await page.click('div[role="option"]:has-text("Done")');

    // Quality gate error should not be visible
    await expect(
      page.locator("text=Cannot resolve work item while child sub-tasks are incomplete"),
    ).not.toBeVisible();
  });

  test("6. @Mentions in Comments and Notification Bell", async () => {
    // Type comment in MentionInput
    const commentInput = page.locator('textarea[placeholder*="Write a comment"]');
    await commentInput.fill("Hey @[Bootstrap Administrator (Temporary)](cl123) please review this implementation!");

    // Post comment
    await page.click('button:has-text("Post Comment")');

    // Verify comment rendered with @mention pill
    await expect(page.locator("text=@Bootstrap Administrator (Temporary)").first()).toBeVisible({ timeout: 10000 });

    // Close the Work Item Drawer so header elements are not intercepted by the drawer
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);

    // Verify Notification Popover exists in Top Header
    const notificationBell = page.locator('button[title="Notifications & Mentions"]');
    await expect(notificationBell).toBeVisible();

    // Open Notification Popover
    await notificationBell.click();
    await expect(page.locator("text=Notifications").first()).toBeVisible({ timeout: 5000 });
  });
});
