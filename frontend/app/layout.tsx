import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#2563eb',
};

export const metadata: Metadata = {
  title: "OrbisKart - India's Trusted Marketplace & Pay Hub",
  description: 'Zero Hidden Charges Online Shopping, Bill Payments & Recharges',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OrbisKart',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <body className="antialiased">
        {children}

        {/* Razorpay पेमेंट चेकआउट SDK */}
        <Script
          id="razorpay-checkout-sdk"
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}