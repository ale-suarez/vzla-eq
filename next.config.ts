import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  // `sharp` is a native module. Without this, Next tries to bundle it into the
  // route's serverless output, which can emit the importing module (e.g.
  // api/inspections/draft.ts) as raw ESM that the CJS loader then fails to
  // load with "Cannot use import statement outside a module". Keeping it
  // external makes Next require it from node_modules at runtime instead.
  serverExternalPackages: ["sharp"],
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
