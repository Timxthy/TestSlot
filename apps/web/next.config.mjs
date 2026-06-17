/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // packages/shared ships TypeScript source; let Next transpile it.
  transpilePackages: ["@testslot/shared"],
};

export default nextConfig;
