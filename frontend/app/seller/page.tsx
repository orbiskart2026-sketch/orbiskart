'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SellerOrderLedger {
  id: string;
  date: string;
  product: string;
  selling_price: number;
  gateway_fee: number;      // 2% Razorpay
  shipping_fee: number;     // Carrier fee
  platform_margin: number;  // OrbisKart flat transparent fee
  gst_deduction: number;    // Tax
  net_seller_payout: number;// Final in-bank amount
  dispatched_weight: string;
  courier_status: string;
  payout_status: 'Settled to Bank' | 'In Escrow (T+2)' | 'Pending Delivery';
  utr_number: string;
}

export default function SellerPortalPage() {
  const [orders, setOrders] = useState<SellerOrderLedger[]>([]);

  useEffect(() => {
    // सेलर के लिए पारदर्शी फाइनेंशियल लेजर डेटा
    const mockSellerLedger: SellerOrderLedger[] = [
      {
        id: 'ORD-177013-A',
        date: '05 Sep 2026',
        product: 'Pure Banarasi Silk Saree',
        selling_price: 1499.00,
        gateway_fee: 29.98,       // 2%
        shipping_fee: 65.00,      // Pre-calculated by weight
        platform_margin: 45.00,   // Flat transparent 3%
        gst_deduction: 25.19,     // 18% GST on services
        net_seller_payout: 1333.83,
        dispatched_weight: '450g (Verified by Scale Cam)',
        courier_status: 'In Transit (Delhivery Express)',
        payout_status: 'In Escrow (T+2)',
        utr_number: 'AXIS_NODAL_PENDING',
      },
      {
        id: 'ORD-177012-B',
        date: '03 Sep 2026',
        product: 'Handcrafted Kundan Jewellery Set',
        selling_price: 2499.00,
        gateway_fee: 49.98,
        shipping_fee: 70.00,
        platform_margin: 75.00,
        gst_deduction: 35.09,
        net_seller_payout: 2268.93,
        dispatched_weight: '320g (Verified by Scale Cam)',
        courier_status: 'Delivered & Customer Verified',
        payout_status: 'Settled to Bank',
        utr_number: 'UTR9823471029384',
      }
    ];
    setOrders(mockSellerLedger);
  }, []);

  const totalGross = orders.reduce((sum, o) => sum + o.selling_price, 0);
  const totalNetPayout = orders.reduce((sum, o) => sum + o.net_seller_payout, 0);
  const totalDeductions = totalGross - totalNetPayout;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-20">
      {/* Seller Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-black text-blue-400">
              OrbisKart
            </Link>
            <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-md border border-slate-700">
              Merchant Partner Hub
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span>●</span> Live Audit Sync
            </span>
            <Link href="/" className="text-slate-300 hover:text-white font-medium">
              View Storefront
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Seller Itemized Financial Ledger</h1>
          <p className="text-xs text-gray-500 mt-1">
            शून्य छुपा हुआ शुल्क (0% Hidden Charges), पारदर्शी कूरियर वज़न और बैंक सेटलमेंट ऑडिट
          </p>
        </div>

        {/* Financial Transparency Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Gross Sales (कुल बिक्री)
            </span>
            <span className="text-2xl font-black text-gray-900">₹{totalGross.toFixed(2)}</span>
            <span className="text-[11px] text-gray-500 block mt-2">ग्राहक द्वारा भुगतान की गई राशि</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Total Itemized Deductions
            </span>
            <span className="text-2xl font-black text-rose-600">- ₹{totalDeductions.toFixed(2)}</span>
            <span className="text-[11px] text-gray-500 block mt-2">गेटवे (2%) + शिपिंग + प्लेटफ़ॉर्म मार्जिन</span>
          </div>

          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-xs">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              Net Bank Settlement (खाते में राशि)
            </span>
            <span className="text-2xl font-black text-emerald-700">₹{totalNetPayout.toFixed(2)}</span>
            <span className="text-[11px] text-emerald-800 font-medium block mt-2">सीधे आपके रजिस्टर्ड बैंक में सेटल</span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
              Itemized Order Settlement Log
            </h2>
            <span className="text-xs text-gray-500 font-bold">100% Tax & Fee Disclosed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[10px] tracking-wider border-b">
                <tr>
                  <th className="p-4">Order / Date</th>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Gross Sale</th>
                  <th className="p-4">Gateway (2%)</th>
                  <th className="p-4">Shipping Fee</th>
                  <th className="p-4">Platform Fee</th>
                  <th className="p-4">Net Seller Payout</th>
                  <th className="p-4">Weight Proof</th>
                  <th className="p-4">Bank Status / UTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <span className="font-mono font-bold text-gray-900 block">{ord.id}</span>
                      <span className="text-[10px] text-gray-400">{ord.date}</span>
                    </td>
                    <td className="p-4 font-bold text-gray-800">{ord.product}</td>
                    <td className="p-4 font-black text-gray-900">₹{ord.selling_price.toFixed(2)}</td>
                    <td className="p-4 text-rose-600">-₹{ord.gateway_fee.toFixed(2)}</td>
                    <td className="p-4 text-rose-600">-₹{ord.shipping_fee.toFixed(2)}</td>
                    <td className="p-4 text-rose-600">-₹{ord.platform_margin.toFixed(2)}</td>
                    <td className="p-4">
                      <span className="font-black text-emerald-700 text-sm block">
                        ₹{ord.net_seller_payout.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 block text-center">
                        {ord.dispatched_weight}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1 ${
                          ord.payout_status === 'Settled to Bank'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.payout_status}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400 block truncate max-w-[120px]" title={ord.utr_number}>
                        {ord.utr_number}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weight Dispute Protection Architecture */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚖️</span>
            <h3 className="text-sm font-black text-blue-900">Zero-Fraud Weight Dispute Architecture</h3>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            कूरियर कंपनियाँ बाद में वजन बढ़ाकर अतिरिक्त शुल्क (Dead/Volumetric weight charges) नहीं काट सकतीं। 
            पार्सल डिस्पैच करते समय सेलर का वज़न और बारकोड स्केल-कैमरा द्वारा डिजिटली लॉक्ड होता है, जो कूरियर पार्टनर के साथ साझा अनुबंध का हिस्सा है।
          </p>
        </div>
      </main>
    </div>
  );
}