import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    return [
      {
        source: "/v1/:path*",
        destination: `${apiBaseUrl}/v1/:path*`
      }
    ];
  },
  turbopack: {
    root: path.resolve(__dirname)
  }
};

export default nextConfig;
