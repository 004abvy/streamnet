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
// @ts-ignore
const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.5', 'localhost'],
  turbopack: {},
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
        destination: `${process.env.OMSS_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/v1/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);