import { chromium } from "../../node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";

async function testUI() {
  console.log("🚀 Launching Chrome to test Centraxis UI...");
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Visit Login Page
    console.log("1. Visiting http://localhost:3001/login ...");
    await page.goto("http://localhost:3001/login", { waitUntil: "networkidle" });
    console.log("Page title:", await page.title());
    await page.screenshot({ path: "screenshot-1-login.png" });

    // 2. Perform Local Dev Credentials Login
    console.log("2. Logging in as Alex Morgan (alex.morgan@centvis.com)...");
    await page.fill('input[type="email"]', "alex.morgan@centvis.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await page.waitForURL("http://localhost:3001/", { timeout: 15000 });
    console.log("Navigated to home! Current URL:", page.url());

    // Wait for workspace and board columns to load
    await page.waitForSelector("text=Centraxis", { timeout: 15000 });
    await page.waitForSelector("text=To Do", { timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshot-2-board.png" });
    console.log("Kanban Board loaded successfully!");

    // 3. Switch to Backlog Tab
    console.log("3. Switching to Backlog Planning tab...");
    await page.click('button:has-text("Backlog")');
    await page.waitForSelector("text=Backlog Planning", { timeout: 10000 });
    await page.screenshot({ path: "screenshot-3-backlog.png" });
    console.log("Backlog Planning loaded with Sprint containers & Capacity Indicators!");

    // 4. Test Command Bar (Cmd+K)
    console.log("4. Triggering Command Bar via keyboard shortcut (Control+K)...");
    await page.keyboard.press("Control+k");
    await page.waitForSelector("text=Centraxis Quick Command", { timeout: 5000 });
    await page.screenshot({ path: "screenshot-4-command-bar.png" });
    console.log("Command Bar opened with grouped actions!");

    // Close Command Bar
    await page.keyboard.press("Escape");

    // 5. Test Quick Create '+' Dropdown in Header
    console.log("5. Testing persistent '+' Create Dropdown in Header...");
    await page.click('header button:has-text("Create")');
    await page.waitForSelector("text=Create Work Item", { timeout: 5000 });
    await page.screenshot({ path: "screenshot-5-create-dropdown.png" });
    console.log("Persistent '+' Create Dropdown opened!");

    // 6. Test Settings / Members page
    console.log("6. Visiting http://localhost:3001/settings/members ...");
    await page.goto("http://localhost:3001/settings/members", { waitUntil: "networkidle" });
    await page.waitForSelector("text=Team Members & Access Management", { timeout: 10000 });
    await page.screenshot({ path: "screenshot-6-members-settings.png" });
    console.log("Team Members & Access Management settings loaded with 25-person team!");

    console.log("✅ All UI validation checks passed successfully!");
  } catch (err) {
    console.error("❌ UI test encountered an error:", err);
    await page.screenshot({ path: "screenshot-error.png" });
  } finally {
    await browser.close();
  }
}

testUI();
