import type { NextConfig } from "next";
// @ts-ignore
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});
const nextConfig: NextConfig = {
  turbopack: {},
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