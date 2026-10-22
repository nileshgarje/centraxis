import { test, expect } from "@playwright/test";

test.describe("Work Item & Sub-Task Full View and Edit Form", () => {
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

  test("1. should render the full view of a work item at /[clientSlug]/[itemKey]", async ({
    page,
  }) => {
    // Navigate directly to CTX-1 under client-apex
    await page.goto("/client-apex/CTX-1");

    // Verify item key is rendered in header and main content
    await expect(page.locator("text=CTX-1").first()).toBeVisible();

    // Verify breadcrumb navigation
    await expect(page.locator("text=Client Apex")).toBeVisible();
    await expect(page.locator("text=Centraxis Core (CTX)")).toBeVisible();

    // Verify top action buttons
    await expect(page.getByRole("link", { name: "Board" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Backlog" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Workflow", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy Link" })).toBeVisible();

    // Verify main sections
    await expect(page.getByText("Description", { exact: true })).toBeVisible();
    await expect(page.getByText("Acceptance Criteria (INVEST)")).toBeVisible();
    await expect(page.getByText("Sub-Tasks & Checklist")).toBeVisible();
    await expect(
      page.getByText("Discussion", { exact: false }).first(),
    ).toBeVisible();

    // Verify sidebar attributes
    await expect(
      page.getByText("Status", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Assignee", { exact: true })).toBeVisible();
    await expect(page.getByText("Priority", { exact: true })).toBeVisible();
    await expect(page.getByText("Story Points", { exact: true })).toBeVisible();
    await expect(page.getByText("Sprint", { exact: true })).toBeVisible();

    // Click "Board" to navigate back to project board
    await page.getByRole("link", { name: "Board" }).click();
    await page.waitForURL("**/client-apex/CTX/board", { timeout: 10000 });
    expect(page.url()).toContain("/client-apex/CTX/board");
  });

  test("2. should provide open in new tab option on board card and in detail sheet", async ({
    page,
  }) => {
    await page.goto("/client-apex/CTX/board");
    await page.waitForSelector('[data-testid="work-item-card"]', {
      timeout: 15000,
    });

    // Check card for external link on the key
    const cardKeyLink = page
      .locator('a[title*="Open CTX-1 in new tab"]')
      .first();
    await expect(cardKeyLink).toBeVisible();
    expect(await cardKeyLink.getAttribute("href")).toBe("/client-apex/CTX-1");
    expect(await cardKeyLink.getAttribute("target")).toBe("_blank");

    // Click the card body to open detail drawer
    await page.locator('[data-item-key="CTX-1"]').first().click();

    // Verify "Open in new tab" button is visible in drawer
    const openInNewTabBtn = page.getByRole("link", { name: "Open in new tab" });
    await expect(openInNewTabBtn).toBeVisible();
    expect(await openInNewTabBtn.getAttribute("href")).toBe(
      "/client-apex/CTX-1",
    );
    expect(await openInNewTabBtn.getAttribute("target")).toBe("_blank");
  });

  test("3. sub-tasks should have same edit form like work items and support open in new tab", async ({
    page,
  }) => {
    // Open Story 1 (CTX-3) directly which has sub-tasks (CTX-5, CTX-6)
    await page.goto("/client-apex/CTX-3");
    await expect(page.getByText("Sub-Tasks & Checklist")).toBeVisible();
    await expect(page.locator("text=CTX-6").first()).toBeVisible();

    // Verify sub-task displays sub-task type icon
    await expect(
      page.locator('[data-testid="subtask-type-icon"]').first(),
    ).toBeVisible();

    // Verify sub-task has "open in new tab" link
    const subTaskNewTabLink = page
      .locator('a[href="/client-apex/CTX-6"]')
      .first();
    await expect(subTaskNewTabLink).toBeVisible();
    expect(await subTaskNewTabLink.getAttribute("target")).toBe("_blank");

    // Click on the sub-task title to open it in edit mode
    await page
      .locator("text=Fix session callback missing active organizationId")
      .first()
      .click();

    // Verify the sub-task now has the exact same edit form as a work item in the drawer:
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // 1. Back button to return to parent
    await expect(drawer.getByRole("button", { name: "Back" })).toBeVisible();

    // 2. Subtask of parent banner
    await expect(drawer.getByText("Subtask of")).toBeVisible();
    await expect(drawer.getByRole("button", { name: /CTX-3/ })).toBeVisible();

    // 3. Edit fields
    await expect(
      drawer.locator(
        'input[value="Fix session callback missing active organizationId"]',
      ),
    ).toBeVisible();
    await expect(
      drawer.getByText("Description", { exact: true }),
    ).toBeVisible();
    await expect(
      drawer.getByText("Acceptance Criteria", { exact: false }),
    ).toBeVisible();
    await expect(drawer.getByText("Assignee", { exact: true })).toBeVisible();
    await expect(drawer.getByText("Priority", { exact: true })).toBeVisible();

    // 4. Sub-task drawer has "Open in new tab" button pointing to CTX-6
    const subtaskDrawerNewTab = drawer.getByRole("link", {
      name: "Open in new tab",
    });
    await expect(subtaskDrawerNewTab).toBeVisible();
    expect(await subtaskDrawerNewTab.getAttribute("href")).toBe(
      "/client-apex/CTX-6",
    );

    // 5. Test navigating back to parent
    await drawer.getByRole("button", { name: "Back" }).click();
    await expect(page.locator("text=CTX-3").first()).toBeVisible();

    // 6. Navigate directly to sub-task in full page view (/client-apex/CTX-6)
    await page.goto("/client-apex/CTX-6");
    await expect(page.locator("text=CTX-6").first()).toBeVisible();
    await expect(page.getByText("Subtask of")).toBeVisible();
    await expect(
      page.locator(
        'input[value="Fix session callback missing active organizationId"]',
      ),
    ).toBeVisible();
    await expect(page.getByText("Description", { exact: true })).toBeVisible();
  });
});
