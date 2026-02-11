import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger request bodies for PDF uploads (up to 20MB base64)
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
