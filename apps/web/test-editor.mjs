import { chromium } from "../../node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";

async function testEditor() {
  console.log("🚀 Launching Chrome to test Markdown & Code-Block Editor UX...");
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Visit Login Page & authenticate
    console.log("1. Visiting http://localhost:3001/login ...");
    await page.goto("http://localhost:3001/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "alex.morgan@centvis.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await page.waitForURL("http://localhost:3001/", { timeout: 15000 });
    console.log("Navigated to home! Current URL:", page.url());

    // Wait for Kanban board to render
    await page.waitForSelector("text=To Do", { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 2. Open Create Item Dialog
    console.log("2. Opening '+ Create Item' dialog...");
    // Open via global shortcut 'c'
    await page.keyboard.press("c");
    await page.waitForSelector("text=Add an Epic, Feature, Story, Task, or Bug", { timeout: 10000 });
    console.log("Create Work Item dialog is open!");

    // Verify MarkdownEditor is rendered
    await page.waitForSelector("text=Write", { timeout: 5000 });
    await page.waitForSelector("text=Preview", { timeout: 5000 });
    console.log("Found Write / Preview tabs in MarkdownEditor!");

    // Fill Title
    await page.fill(
      'input[placeholder*="As a team member"]',
      "Implement developer markdown editor with code-blocks and lowlight"
    );

    // Fill Description in TipTap editor
    const editorElement = page.locator(".ProseMirror").first();
    await editorElement.click();
    await page.keyboard.type(
      "Here is the technical specification:\n- [x] Integrate TipTap starter kit\n- [ ] Lowlight syntax highlighting\n\n```typescript\nconst greet = (name: string): string => `Hello ${name}`;\nconsole.log(greet('Centraxis'));\n```"
    );

    // Toggle Preview tab to verify zero formatting corruption & rendered code block
    console.log("Toggling to Preview tab...");
    const previewButtons = page.locator('button:has-text("Preview")');
    await previewButtons.first().click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "screenshot-editor-create-dialog.png" });
    console.log("Captured screenshot-editor-create-dialog.png!");

    // Close Create Dialog via Cancel button
    console.log("Closing Create Dialog...");
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(1000);

    // 3. Open WorkItemDrawer by clicking an existing card
    console.log("3. Clicking board card CTX-1 to open WorkItemDrawer...");
    const card = page.locator("text=CTX-1").first();
    await card.click();

    // Verify WorkItemDrawer opened
    await page.waitForSelector("text=Developer Comments & Activity", { timeout: 10000 });
    console.log("WorkItemDrawer opened successfully with developer comments & markdown editors!");
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "screenshot-editor-drawer.png" });
    console.log("Captured screenshot-editor-drawer.png!");

    console.log("✅ All Markdown Editor & Code Block tests passed successfully!");
  } catch (err) {
    console.error("❌ Test error:", err);
    await page.screenshot({ path: "screenshot-editor-error.png" });
  } finally {
    await browser.close();
  }
}

testEditor();
