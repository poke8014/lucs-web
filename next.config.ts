import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "scrapaholic.lucttang.dev",
          },
        ],
        destination: "/scrapaholic/:path*",
      },
    ];
  },
};

export default nextConfig;
