import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true
  },
  transpilePackages: [],
  turbopack: {
    root: path.resolve(__dirname)
  }
};

export default nextConfig;
