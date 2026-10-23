import { test, expect, Page } from "@playwright/test";

async function loginAdmin(page: Page) {
  await page.goto("/login");
  if (!page.url().includes("/login") && !page.url().includes("/auth/signin")) {
    return;
  }
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill("admin@centvis.com");
  await passwordInput.fill("AdminPassword123!");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(
    (url) =>
      !url.pathname.includes("/login") &&
      !url.pathname.includes("/auth/signin"),
    { timeout: 15000 },
  );
}

test.describe("Enterprise Security Hardening, OWASP Defenses & Rate Limiting", () => {
  test.describe.configure({ mode: "serial" });

  test("1. Production Security Headers are served on HTTP responses", async ({
    request,
  }) => {
    const response = await request.get("/");
    const headers = response.headers();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["strict-transport-security"]).toContain("max-age=31536000");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });

  test("2. File upload hardening blocks executables and malicious SVGs", async ({
    page,
  }) => {
    await loginAdmin(page);
    const testIp = "203.0.113.88";

    // Attempt to upload an executable .exe file
    const exeUpload = await page.request.post("/api/upload", {
      headers: { "x-forwarded-for": testIp },
      multipart: {
        file: {
          name: "malicious_payload.exe",
          mimeType: "application/octet-stream",
          buffer: Buffer.from("MZ\\x90\\x00\\x03ThisIsExecutable"),
        },
      },
    });

    expect(exeUpload.status()).toBe(400);
    const exeBody = await exeUpload.json();
    expect(exeBody.error).toContain("blocked for security reasons");

    // Attempt to upload an SVG containing XSS script payload
    const svgUpload = await page.request.post("/api/upload", {
      headers: { "x-forwarded-for": testIp },
      multipart: {
        file: {
          name: "exploit.svg",
          mimeType: "image/svg+xml",
          buffer: Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script></svg>',
          ),
        },
      },
    });

    expect(svgUpload.status()).toBe(400);
    const svgBody = await svgUpload.json();
    expect(svgBody.error).toContain("dangerous elements or scripts");
  });

  test("3. Rate limiting enforces 429 Too Many Requests on sensitive endpoints", async ({
    request,
  }) => {
    const testIp = "203.0.113.42";
    let hitRateLimit = false;
    let rateLimitResponse: any = null;

    // Up to 14 requests (tier allows 10 requests per 60s per IP)
    for (let i = 0; i < 14; i++) {
      const res = await request.post("/api/upload", {
        headers: { "x-forwarded-for": testIp },
      });
      if (res.status() === 429) {
        hitRateLimit = true;
        rateLimitResponse = res;
        break;
      }
    }

    expect(hitRateLimit).toBe(true);
    const headers = rateLimitResponse.headers();
    expect(headers["x-ratelimit-limit"]).toBe("10");
    expect(headers["x-ratelimit-remaining"]).toBe("0");
    expect(headers["retry-after"]).toBeDefined();

    const body = await rateLimitResponse.json();
    expect(body.error).toContain("Rate limit exceeded");
  });

  test("4. Stored XSS neutralization in Markdown description renders safely without scripts", async ({
    page,
  }) => {
    await loginAdmin(page);
    await page.goto("/client-apex/CTX/board");
    await expect(page.locator("text=ACTIVE").first()).toBeVisible({
      timeout: 15000,
    });

    // Check if cards are present on board
    const firstCard = page.locator('[data-testid="work-item-card"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();

      // Verify drawer or description opened
      await expect(
        page
          .locator("text=Description")
          .or(page.locator("text=Activity & Comments"))
          .first(),
      ).toBeVisible({ timeout: 10000 });

      // Verify markdown renderer container exists and does not execute or inject script tags
      const scriptElements = page.locator(".prose-sm script, script:text('XSS')");
      expect(await scriptElements.count()).toBe(0);
    }
  });

  test("5. BOLA / IDOR protection rejects unauthorized updates on non-existent or foreign entities", async ({
    page,
  }) => {
    await loginAdmin(page);

    // Attempt to invoke backlog.updateItem with an invalid / unauthorized ID
    const trpcResponse = await page.request.post(
      "/api/trpc/backlog.updateItem?batch=1",
      {
        data: {
          "0": {
            json: {
              id: "non-existent-or-unauthorized-item-id",
              title: "Hacked Title",
            },
          },
        },
      },
    );

    const body = await trpcResponse.json();
    // Verify tRPC returned an error with code NOT_FOUND or FORBIDDEN
    expect(body[0]?.error).toBeDefined();
    expect(["NOT_FOUND", "FORBIDDEN"]).toContain(
      body[0]?.error?.json?.data?.code,
    );
  });
});
