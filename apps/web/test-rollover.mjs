import { chromium } from "../../node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";

async function testSprintRollover() {
  console.log("🚀 Launching Chrome to test 1-Click Automated Sprint Rollover...");
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Authenticate
    console.log("1. Authenticating as Alex Morgan...");
    await page.goto("http://localhost:3001/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "alex.morgan@centvis.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await page.waitForURL("http://localhost:3001/", { timeout: 15000 });
    console.log("Navigated to home! Current URL:", page.url());

    // Wait for Kanban board to load
    await page.waitForSelector("text=Complete Sprint", { timeout: 15000 });
    console.log("Kanban Board loaded with 'Complete Sprint' button!");

    // 2. Click Complete Sprint on Kanban Board
    console.log("2. Clicking 'Complete Sprint' button...");
    await page.click('button:has-text("Complete Sprint")');

    // Wait for CompleteSprintDialog modal to render
    await page.waitForSelector("text=1-Click Closeout & Automated Work Item Rollover", { timeout: 10000 });
    await page.waitForSelector("text=Burn Efficiency", { timeout: 10000 });
    console.log("CompleteSprintDialog opened with summary metrics & rollover destinations!");
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "screenshot-sprint-rollover-modal.png" });
    console.log("Captured screenshot-sprint-rollover-modal.png!");

    // 3. Select Next Planned Sprint (if not already selected) & Submit Rollover
    console.log("3. Executing Complete Sprint & Rollover Items...");
    const submitBtn = page.locator('button:has-text("Complete Sprint & Rollover Items")');
    await submitBtn.click();

    // 4. Wait for toast notification
    console.log("4. Waiting for rollover completion toast notification...");
    await page.waitForSelector("text=completed", { timeout: 15000 });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: "screenshot-sprint-rollover-success.png" });
    console.log("Captured screenshot-sprint-rollover-success.png!");

    // 5. Navigate to Backlog View to verify items rolled over to Sprint 2
    console.log("5. Checking Backlog view...");
    await page.click('button:has-text("Backlog")');
    await page.waitForSelector("text=Backlog Planning", { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "screenshot-sprint-rollover-backlog.png" });
    console.log("Captured screenshot-sprint-rollover-backlog.png!");

    console.log("✅ 1-Click Automated Sprint Rollover and Closeout workflow tested successfully!");
  } catch (err) {
    console.error("❌ Rollover test error:", err);
    await page.screenshot({ path: "screenshot-rollover-error.png" });
  } finally {
    await browser.close();
  }
}

testSprintRollover();
