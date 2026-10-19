import { test, expect, Page } from "@playwright/test";

/**
 * Helper to authenticate as the seed admin user.
 */
async function authenticateAsAdmin(page: Page) {
  await page.goto("/login");

  // Check if already signed in
  if (!page.url().includes("/login") && !page.url().includes("/auth/signin")) {
    return;
  }

  // Fill credentials for seed administrator
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill("admin@centvis.com");
  await passwordInput.fill("AdminPassword123!");

  // Submit credentials
  await page.locator('button[type="submit"]').click();

  // Wait for session initialization and redirection to project workspace
  await page.waitForURL((url) => !url.pathname.includes("/login") && !url.pathname.includes("/auth/signin"), {
    timeout: 15000,
  });
}

test.describe("Sprint & Backlog Item Count Parity E2E", () => {
  test.describe.configure({ mode: "serial" });
  const projectKey = "CTX";

  test.beforeEach(async ({ page }) => {
    await authenticateAsAdmin(page);
  });

  test("Scenario 1: Direct Count Parity Check between Backlog Active Sprint and Kanban Board", async ({
    page,
  }) => {
    // 1. Navigate to /projects/[projectKey]/backlog
    await page.goto(`/projects/${projectKey}/backlog`);

    // Ensure Backlog Planning workspace is loaded
    await expect(page.locator("text=Backlog Planning")).toBeVisible({
      timeout: 15000,
    });

    // 2. Locate the Active Sprint container
    const activeSprintContainer = page.locator('[data-testid="active-sprint-container"]');
    await expect(activeSprintContainer).toBeVisible({ timeout: 10000 });

    // 3. Count all item cards rendered inside the active sprint container
    const backlogActiveCards = activeSprintContainer.locator('[data-testid="work-item-card"]');
    const backlogActiveItemCount = await backlogActiveCards.count();
    console.log(`[E2E] Backlog active sprint item count: ${backlogActiveItemCount}`);

    // 4. Navigate to the Active Sprint Board (/projects/[projectKey]/board)
    await page.goto(`/projects/${projectKey}/board`);

    // Wait for the Kanban board columns to render
    const kanbanColumns = page.locator('[data-testid="kanban-column"]');
    await expect(kanbanColumns.first()).toBeVisible({ timeout: 15000 });

    // Ensure all 4 columns are rendered (To Do, In Progress, In Review, Done)
    await expect(kanbanColumns).toHaveCount(4);

    // 5. Query all columns and sum the total card elements
    const boardCards = page.locator('[data-testid="kanban-column"] [data-testid="work-item-card"]');
    const boardTotalItemCount = await boardCards.count();
    console.log(`[E2E] Kanban board total item count: ${boardTotalItemCount}`);

    // 6. Assert count parity
    expect(boardTotalItemCount).toBe(backlogActiveItemCount);
  });

  test("Scenario 2: Dynamic Sync After Adding an Item via Inline Quick-Add without hard refresh", async ({
    page,
  }) => {
    // 1. Navigate to Backlog view
    await page.goto(`/projects/${projectKey}/backlog`);
    await expect(page.locator("text=Backlog Planning")).toBeVisible({
      timeout: 15000,
    });

    const activeSprintContainer = page.locator('[data-testid="active-sprint-container"]');
    await expect(activeSprintContainer).toBeVisible({ timeout: 10000 });

    // Record initial count on Backlog page
    const backlogCards = activeSprintContainer.locator('[data-testid="work-item-card"]');
    const initialCount = await backlogCards.count();
    console.log(`[E2E] Initial backlog count: ${initialCount}`);

    // 2. Use the inline quick-add inside the active sprint container
    const quickAddTrigger = activeSprintContainer.locator('[data-testid="inline-create-trigger"]');
    await expect(quickAddTrigger).toBeVisible();
    await quickAddTrigger.click();

    // Type a unique title and submit
    const quickAddInput = activeSprintContainer.locator('[data-testid="inline-create-input"]');
    await expect(quickAddInput).toBeVisible();

    const newItemTitle = `Sync Parity Test Story ${Date.now()}`;
    await quickAddInput.fill(newItemTitle);
    await quickAddInput.press("Enter");

    // 3. Verify the item card is immediately added to the active sprint container
    const expectedCount = initialCount + 1;
    await expect(backlogCards).toHaveCount(expectedCount, { timeout: 10000 });
    await expect(activeSprintContainer.locator(`text=${newItemTitle}`)).toBeVisible();

    // 4. Switch to Board view using in-app tab switch (WITHOUT hard page refresh)
    const activeBoardTab = page.locator('[data-testid="tab-active-board"]');
    if (await activeBoardTab.isVisible()) {
      await activeBoardTab.click();
    } else {
      await page.click("text=Active Board");
    }

    // 5. Assert that the Board immediately displays the updated item count
    const boardColumns = page.locator('[data-testid="kanban-column"]');
    await expect(boardColumns.first()).toBeVisible({ timeout: 15000 });

    const boardCards = page.locator('[data-testid="kanban-column"] [data-testid="work-item-card"]');
    await expect(boardCards).toHaveCount(expectedCount, { timeout: 10000 });

    // Also assert that the newly created card is visible on the board
    await expect(
      page.locator('[data-testid="kanban-column"]').getByText(newItemTitle),
    ).toBeVisible();
    console.log(`[E2E] Successfully verified dynamic sync: Board updated to ${expectedCount} cards immediately`);
  });
});
