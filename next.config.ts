import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/index',
      },
    ]
  }
};

export default nextConfig;
