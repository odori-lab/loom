import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['chrome-aws-lambda', 'puppeteer-core'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent-*.cdninstagram.com',
      },
    ],
  },
};

export default nextConfig;
