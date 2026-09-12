import type { NextConfig } from "next";
// @ts-ignore
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  buildExcludes: [/^\/api\//],
  publicExcludes: ['!api/**/*'],
});
const nextConfig: NextConfig = {
  turbopack: {},
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.fanart.tv',
      }
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/omss/:path*',
        destination: 'http://localhost:4000/v1/:path*', // Proxy to local OMSS backend
      },
    ];
  },
};

export default withPWA(nextConfig);