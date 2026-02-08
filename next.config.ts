import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium-min', 'playwright-core'],
  outputFileTracingIncludes: {
    '/api/scrape': ['node_modules/@sparticuz/chromium-min/**/*'],
    '/api/generate-pdf': ['node_modules/@sparticuz/chromium-min/**/*'],
    '/api/looms': ['node_modules/@sparticuz/chromium-min/**/*'],
  },
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
