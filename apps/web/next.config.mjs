/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self';",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' data: blob: https:;",
      "font-src 'self' data:;",
      "connect-src 'self' ws: wss:;",
      "frame-ancestors 'none';",
    ].join(" "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  transpilePackages: [
    "@centraxis/ai",
    "@centraxis/api",
    "@centraxis/auth",
    "@centraxis/db",
    "@centraxis/env",
    "@centraxis/ui",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
