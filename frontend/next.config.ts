/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // --- महत्वपूर्ण: फ्रंटएंड की API रिक्वेस्ट को सीधे Render बैकएंड पर भेजने के लिए Rewrites ---
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://orbiskart.onrender.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;