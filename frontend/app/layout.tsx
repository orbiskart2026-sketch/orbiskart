import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: "OrbisKart - India's Trusted Shopping Destination",
  description: 'Shop sarees, suits, jewellery, fashion, electronics and more.',
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