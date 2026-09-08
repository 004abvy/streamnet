declare module 'next-pwa' {
  import { NextConfig } from 'next';
  export default function withPWAInit(config: any): (nextConfig: NextConfig) => NextConfig;
}
