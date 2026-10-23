import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authAndUploadLimiter } from "@centraxis/api/ratelimit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Sensitive endpoints IP rate limiting (/api/auth/callback/*, /api/auth/signin/*, and /api/upload)
  const isSensitiveAuth =
    pathname.startsWith("/api/auth/callback") ||
    pathname.startsWith("/api/auth/signin");
  const isUpload = pathname.startsWith("/api/upload");

  if (isSensitiveAuth || isUpload) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0]?.trim() : "127.0.0.1";
    const rateLimit = await authAndUploadLimiter.limit(ip || "127.0.0.1");

    const rateLimitHeaders = {
      "X-RateLimit-Limit": rateLimit.limit.toString(),
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      "X-RateLimit-Reset": rateLimit.reset.toString(),
    };

    if (!rateLimit.success) {
      return new NextResponse(
        JSON.stringify({
          error:
            "Rate limit exceeded. Please wait before making more requests.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.max(
              1,
              Math.ceil((rateLimit.reset - Date.now()) / 1000),
            ).toString(),
            ...rateLimitHeaders,
          },
        },
      );
    }

    const response = NextResponse.next();
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Ignore static assets, public routes, next internals, and other api endpoints
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/icons") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for NextAuth session token in cookies
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/upload",
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
