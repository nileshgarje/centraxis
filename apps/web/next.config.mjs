/** @type {import('next').NextConfig} */
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
};

export default nextConfig;
