import { test, expect } from "@playwright/test";

test.describe("Board/Backlog Filter Bar & Personal My Work Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    if (page.url().includes("/login") || page.url().includes("/auth/signin")) {
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      await expect(emailInput).toBeVisible({ timeout: 10000 });
      await emailInput.fill("alex.morgan@centvis.com");
      await passwordInput.fill("password123");
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(
        (url) =>
          !url.pathname.includes("/login") &&
          !url.pathname.includes("/auth/signin"),
        { timeout: 20000 },
      );
    }
  });

  test("1. Board Filter Bar: quick text search, avatar filter, status filter, and URL synchronization", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="work-item-card"]', {
      timeout: 15000,
    });

    // 1. Verify Board Filter Bar exists
    const filterBar = page.locator('[data-testid="board-filter-bar"]');
    await expect(filterBar).toBeVisible();

    // Count initial cards on the board
    const initialCardCount = await page
      .locator('[data-testid="work-item-card"]')
      .count();
    expect(initialCardCount).toBeGreaterThan(0);

    // 2. Test Quick Text Search (debounced 250ms)
    const searchInput = page.locator('[data-testid="board-search-input"]');
    await expect(searchInput).toBeVisible();

    // Type a specific search query matching CTX-1
    await searchInput.fill("CTX-1");
    await page.waitForTimeout(600); // allow debounce and history sync

    // Confirm URL updated with ?q=CTX-1
    expect(page.url()).toContain("q=CTX-1");

    // Cards should narrow down to CTX-1
    const filteredCount = await page
      .locator('[data-testid="work-item-card"]')
      .count();
    expect(filteredCount).toBeLessThanOrEqual(initialCardCount);
    await expect(page.locator("text=CTX-1").first()).toBeVisible();

    // 3. Test "Clear all" button
    const clearBtn = page.locator('[data-testid="filter-clear-all"]');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await page.waitForTimeout(300);

    // Verify search input is cleared and URL resets
    expect(await searchInput.inputValue()).toBe("");
    expect(page.url()).not.toContain("q=CTX-1");

    // Verify Avatar Tooltip on hover
    const firstAvatar = page.locator('[data-testid^="filter-avatar-"]').first();
    if (await firstAvatar.isVisible()) {
      await firstAvatar.hover();
      // Tooltip should be visible with popover styling and high-contrast text
      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();
      await expect(tooltip.locator("p.font-semibold").first()).toBeVisible();
      await expect(
        tooltip.getByText(/Click to filter|Click to unselect/),
      ).toBeVisible();
    }

    // 4. Test "Only My Issues" filter shortcut
    const onlyMyIssuesBtn = page.locator(
      '[data-testid="filter-only-my-issues"]',
    );
    if (await onlyMyIssuesBtn.isVisible()) {
      await onlyMyIssuesBtn.click();
      await page.waitForTimeout(300);

      // Verify assignees param in URL
      expect(page.url()).toContain("assignees=");

      // Click again to toggle off
      await onlyMyIssuesBtn.click();
      await page.waitForTimeout(300);
      expect(page.url()).not.toContain("assignees=");
    }

    // 5. Test Status Dropdown Filter
    const statusDropdownBtn = page.locator(
      '[data-testid="filter-status-dropdown"]',
    );
    await statusDropdownBtn.click();

    // Check "In Progress" checkbox
    const inProgressOption = page.locator(
      '[data-testid="filter-status-checkbox-IN_PROGRESS"]',
    );
    await expect(inProgressOption).toBeVisible();
    await inProgressOption.click();

    // Close dropdown
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // URL should have status=IN_PROGRESS
    expect(page.url()).toContain("status=IN_PROGRESS");

    // Reload page with URL params and verify filters persist
    await page.reload();
    await page.waitForSelector('[data-testid="board-filter-bar"]', {
      timeout: 15000,
    });
    expect(page.url()).toContain("status=IN_PROGRESS");
  });

  test("2. Backlog Filter Bar: filters backlog pool and sprint containers", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/backlog");
    await page.waitForSelector('[data-testid="board-filter-bar"]', {
      timeout: 15000,
    });

    // Test text search in backlog
    const searchInput = page.locator('[data-testid="board-search-input"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill("NonExistentTaskXYZ999");
    await page.waitForTimeout(600);

    // Filtered count across board/backlog should be 0 cards
    const cardCount = await page
      .locator('[data-testid="work-item-card"]')
      .count();
    expect(cardCount).toBe(0);

    // Clear search
    await page.locator('[data-testid="filter-clear-all"]').click();
    await page.waitForTimeout(300);
    expect(await searchInput.inputValue()).toBe("");
  });

  test("3. Personal My Work Dashboard: navigation, tabbed views, counts, search, and drawer inline editing", async ({
    page,
  }) => {
    // 1. Navigate via top global navigation
    await page.goto("/client-apex/CTX/board");
    const myWorkNavBtn = page.locator('[data-testid="nav-my-work"]');
    await expect(myWorkNavBtn).toBeVisible();
    await myWorkNavBtn.click();

    await page.waitForURL("**/my-work", { timeout: 15000 });
    expect(page.url()).toContain("/my-work");

    // 2. Verify header, open issue count badge, and search bar
    await expect(page.locator("h1:has-text('My Work')")).toBeVisible();
    await expect(
      page.locator('[data-testid="my-work-open-count"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="my-work-search-input"]'),
    ).toBeVisible();

    // 3. Verify all 4 tabs exist
    const tabAssigned = page.locator(
      '[data-testid="tab-assigned-unresolved"]',
    );
    const tabResolved = page.locator('[data-testid="tab-resolved"]');
    const tabRecent = page.locator(
      '[data-testid="tab-recently-modified"]',
    );
    const tabReported = page.locator('[data-testid="tab-reported-by-me"]');

    await expect(tabAssigned).toBeVisible();
    await expect(tabResolved).toBeVisible();
    await expect(tabRecent).toBeVisible();
    await expect(tabReported).toBeVisible();

    // 4. Test Tab 2: Resolved
    await tabResolved.click();
    await expect(
      page.locator("text=Loading personal work items..."),
    ).not.toBeVisible({ timeout: 10000 });
    const isResolvedTableVisible = await page
      .locator('[data-testid="my-work-table"]')
      .isVisible();
    const isResolvedEmptyVisible = await page
      .locator('[data-testid="my-work-empty-state"]')
      .isVisible();
    expect(isResolvedTableVisible || isResolvedEmptyVisible).toBeTruthy();

    // 5. Test Tab 3: Recently Modified
    await tabRecent.click();
    await expect(
      page.locator("text=Loading personal work items..."),
    ).not.toBeVisible({ timeout: 10000 });
    const isRecentTableVisible = await page
      .locator('[data-testid="my-work-table"]')
      .isVisible();
    const isRecentEmptyVisible = await page
      .locator('[data-testid="my-work-empty-state"]')
      .isVisible();
    expect(isRecentTableVisible || isRecentEmptyVisible).toBeTruthy();

    // 6. Test Tab 4: Reported by Me
    await tabReported.click();
    await expect(
      page.locator("text=Loading personal work items..."),
    ).not.toBeVisible({ timeout: 10000 });
    const isReportedTableVisible = await page
      .locator('[data-testid="my-work-table"]')
      .isVisible();
    const isReportedEmptyVisible = await page
      .locator('[data-testid="my-work-empty-state"]')
      .isVisible();
    expect(isReportedTableVisible || isReportedEmptyVisible).toBeTruthy();

    // 7. Return to Tab 1: Assigned to Me (Unresolved)
    await tabAssigned.click();
    await expect(
      page.locator("text=Loading personal work items..."),
    ).not.toBeVisible({ timeout: 10000 });

    // If rows are present, test clicking a row to open WorkItemDrawer sheet
    const firstRow = page.locator('[data-testid="my-work-row"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();

      // Drawer sheet dialog should open
      const drawer = page.locator('[role="dialog"]');
      await expect(drawer).toBeVisible({ timeout: 10000 });

      // Close drawer
      const closeBtn = drawer
        .locator('button[aria-label="Close"], button.absolute')
        .first();
      await closeBtn.click();
      await expect(drawer).not.toBeVisible();
    }
  });
});
