import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // यदि आप फ्रंटएंड को भी डॉकर या रेंडर पर स्टैंडअलोन मोड में डिप्लॉय कर रहे हैं:
  // output: 'standalone',
};

export default nextConfig;