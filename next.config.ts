import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:8000/api/:path*' // proxy to fastAPI running locally
            : '/api/index', // Vercel serverless function
        },
      ]
    }
  }
};

export default nextConfig;
