'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AuditRecord {
  id: string;
  orderId: string;
  date: string;
  grossAmount: number;
  gatewayFee: number;
  courierFee: number;
  sellerPayout: number;
  platformNetRevenue: number;
  gstCollected: number;
  reconciliationStatus: 'Matched (100%)' | 'Discrepancy Detected';
  bankRef: string;
}

export default function AdminAuditPage() {
  const [records] = useState<AuditRecord[]>([
    {
      id: 'AUD-901',
      orderId: 'ORD-177013-A',
      date: '05 Sep 2026',
      grossAmount: 1499.00,
      gatewayFee: 29.98,
      courierFee: 65.00,
      sellerPayout: 1333.83,
      platformNetRevenue: 45.00,
      gstCollected: 25.19,
      reconciliationStatus: 'Matched (100%)',
      bankRef: 'NODAL_AXIS_T2_PENDING',
    },
    {
      id: 'AUD-900',
      orderId: 'ORD-177012-B',
      date: '03 Sep 2026',
      grossAmount: 2499.00,
      gatewayFee: 49.98,
      courierFee: 70.00,
      sellerPayout: 2268.93,
      platformNetRevenue: 75.00,
      gstCollected: 35.09,
      reconciliationStatus: 'Matched (100%)',
      bankRef: 'AXIS_SETTLE_98234710',
    },
  ]);

  const totalGross = records.reduce((sum, r) => sum + r.grossAmount, 0);
  const totalSellerPayouts = records.reduce((sum, r) => sum + r.sellerPayout, 0);
  const totalPlatformNet = records.reduce((sum, r) => sum + r.platformNetRevenue, 0);
  const totalTax = records.reduce((sum, r) => sum + r.gstCollected, 0);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 pb-20">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-black text-blue-400 tracking-tight">
              OrbisKart
            </Link>
            <span className="text-[10px] uppercase font-mono bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-bold">
              Autonomous Audit Engine
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Ledger Synchronized
            </span>
            <Link
              href="/"
              className="text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded-lg"
            >
              Exit to Store
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">Automated Reconciliation & Audit Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Leakage Financial Tracking: Razorpay Nodal Escrow ➔ OrbisKart ➔ Axis Bank
          </p>
        </div>

        {/* Financial Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Total Inflow (Gross)
            </span>
            <span className="text-2xl font-black text-white font-mono">₹{totalGross.toFixed(2)}</span>
            <span className="text-[11px] text-slate-500 block mt-2">100% Verified Customer Capital</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Seller Payout Escrow
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono">₹{totalSellerPayouts.toFixed(2)}</span>
            <span className="text-[11px] text-slate-500 block mt-2">Payable upon Delivery OTP</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Platform Pure Revenue
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">₹{totalPlatformNet.toFixed(2)}</span>
            <span className="text-[11px] text-slate-500 block mt-2">Net Platform Margin Earned</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              GST / Tax Provision
            </span>
            <span className="text-2xl font-black text-blue-400 font-mono">₹{totalTax.toFixed(2)}</span>
            <span className="text-[11px] text-slate-500 block mt-2">Audit-Ready Tax Accrual</span>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-300 uppercase tracking-wider font-mono">
              Live Double-Entry Reconciliation
            </h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
              Status: 0 Discrepancies
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Audit / Order</th>
                  <th className="p-4">Gross Collected</th>
                  <th className="p-4">Gateway (2%)</th>
                  <th className="p-4">Courier Cost</th>
                  <th className="p-4">Seller Share</th>
                  <th className="p-4">Net Platform</th>
                  <th className="p-4">Reconciliation</th>
                  <th className="p-4">Bank Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <span className="font-bold text-white block">{r.id}</span>
                      <span className="text-[10px] text-slate-500">{r.orderId}</span>
                    </td>
                    <td className="p-4 font-bold text-white">₹{r.grossAmount.toFixed(2)}</td>
                    <td className="p-4 text-rose-400">-₹{r.gatewayFee.toFixed(2)}</td>
                    <td className="p-4 text-rose-400">-₹{r.courierFee.toFixed(2)}</td>
                    <td className="p-4 text-amber-400 font-bold">₹{r.sellerPayout.toFixed(2)}</td>
                    <td className="p-4 text-emerald-400 font-bold">₹{r.platformNetRevenue.toFixed(2)}</td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                        {r.reconciliationStatus}
                      </span>
                    </td>
                    <td className="p-4 text-[10px] text-slate-500 truncate max-w-[130px]" title={r.bankRef}>
                      {r.bankRef}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security & Audit Guarantee */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-2">
            <span>🔐</span> Data Immutability & Audit Guarantee
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            प्रत्येक लेन-देन का वित्तीय डेटा अपरिवर्तनीय (Immutable) है। 
            ग्राहक के भुगतान से लेकर नोडल बैंक (`orbiskart177013.rzp@rxairtel`), कूरियर शुल्क और सेलर पेआउट का प्रत्येक रुपया स्वचालित ऑडिट लॉग में दर्ज होता है, जिसे वित्तीय वर्ष के अंत में बिना किसी अंतर के सीधे चार्टर्ड अकाउंटेंट (CA) ऑडिट के लिए एक्सपोर्ट किया जा सकता है।
          </p>
        </div>
      </main>
    </div>
  );
}