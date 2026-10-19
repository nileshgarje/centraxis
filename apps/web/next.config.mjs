/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
