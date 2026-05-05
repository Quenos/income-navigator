import type { NextConfig } from 'next';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  basePath,
  allowedDevOrigins: ['quenos.ai', 'www.quenos.ai'],
};

export default nextConfig;
