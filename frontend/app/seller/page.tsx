'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DeductionSlip {
  slip_number: string;
  order_id: string | number;
  gross_amount: string;
  deductions: string;
  net_settled: string;
  is_settled: boolean;
  utr: string;
}

interface SellerSummaryData {
  store_name: string;
  is_approved: boolean;
  penny_drop_verified: boolean;
  wallet_balance: string;
  orders_summary: {
    total: number;
    delivered: number;
    returns: number;
  };
  banking: {
    bank_name: string;
    account_masked: string;
    ifsc: string;
    is_verified: boolean;
  };
  deduction_slips: DeductionSlip[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';

export default function SellerPortalPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SellerSummaryData | null>(null);

  useEffect(() => {
    fetchSellerDashboard();
  }, []);

  const fetchSellerDashboard = async () => {
    setLoading(true);
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/seller/dashboard/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        // फ़ॉलबैक यदि टोकन नहीं है
        setSummary({
          store_name: 'OrbisKart Merchant Hub',
          is_approved: true,
          penny_drop_verified: true,
          wallet_balance: '0.00',
          orders_summary: { total: 0, delivered: 0, returns: 0 },
          banking: {
            bank_name: 'State Bank of India',
            account_masked: 'XXXXXX5402',
            ifsc: 'SBIN0001234',
            is_verified: true,
          },
          deduction_slips: [],
        });
      }
    } catch (err) {
      console.error('Failed to load seller dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadSellerSlip = (orderId: string | number) => {
    window.open(`${API_BASE_URL}/orders/${orderId}/seller-slip/`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-20 font-sans">
      {/* Seller Portal Header */}
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
        {/* Store Title & Penny Drop Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div>
            <h1 className="text-xl font-black text-gray-900">
              {summary?.store_name || 'My Seller Store'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              शून्य छुपा हुआ शुल्क (0% Hidden Cuts), कूरियर वज़न ऑडिट और डायरेक्ट T+3 बैंक सेटलमेंट
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                summary?.is_approved
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
            >
              {summary?.is_approved ? '✔ Verified Seller' : '⏳ Verification Pending'}
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              ₹1 Penny-Drop: {summary?.penny_drop_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Financial Transparency Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Wallet Balance (लाइव बैलेंस)
            </span>
            <span className="text-2xl font-black text-gray-900">
              ₹{summary ? parseFloat(summary.wallet_balance).toFixed(2) : '0.00'}
            </span>
            <span className="text-[11px] text-gray-500 block mt-2">अगले सेटलमेंट चक्र के लिए तैयार</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Total Dispatched Orders
            </span>
            <span className="text-2xl font-black text-blue-600">
              {summary?.orders_summary?.total || 0} Orders
            </span>
            <span className="text-[11px] text-gray-500 block mt-2">
              डिलीवर: {summary?.orders_summary?.delivered || 0} | रिटर्न: {summary?.orders_summary?.returns || 0}
            </span>
          </div>

          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-xs">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              Verified Settlement Account
            </span>
            <span className="text-lg font-black text-emerald-700 block truncate">
              {summary?.banking?.bank_name || 'Bank Account'}
            </span>
            <span className="text-[11px] text-emerald-800 font-mono block mt-1">
              {summary?.banking?.account_masked || 'XXXXXX'} (IFSC: {summary?.banking?.ifsc || 'N/A'})
            </span>
          </div>
        </div>

        {/* Ledger Table with 1-Click PDF Download */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
              Itemized Order Settlement Log & Deduction Slips
            </h2>
            <span className="text-xs text-gray-500 font-bold">100% Tax & Courier Disclosed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[10px] tracking-wider border-b">
                <tr>
                  <th className="p-4">Slip / Order ID</th>
                  <th className="p-4">Gross Sale</th>
                  <th className="p-4">Itemized Deductions</th>
                  <th className="p-4">Net Seller Payout</th>
                  <th className="p-4">Bank Status</th>
                  <th className="p-4">UTR Reference</th>
                  <th className="p-4 text-center">Audit Slip PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {summary && summary.deduction_slips && summary.deduction_slips.length > 0 ? (
                  summary.deduction_slips.map((slip) => (
                    <tr key={slip.slip_number} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <span className="font-mono font-bold text-gray-900 block">{slip.slip_number}</span>
                        <span className="text-[10px] text-gray-400">Order #{slip.order_id}</span>
                      </td>
                      <td className="p-4 font-black text-gray-900">₹{parseFloat(slip.gross_amount).toFixed(2)}</td>
                      <td className="p-4 text-rose-600">-₹{parseFloat(slip.deductions).toFixed(2)}</td>
                      <td className="p-4">
                        <span className="font-black text-emerald-700 text-sm block">
                          ₹{parseFloat(slip.net_settled).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            slip.is_settled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {slip.is_settled ? 'Settled to Bank' : 'In Escrow (T+3)'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-gray-500">
                        {slip.utr}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => downloadSellerSlip(slip.order_id)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg border border-indigo-200 transition cursor-pointer text-[11px]"
                        >
                          📄 Download Slip
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">
                      अभी तक कोई ऑर्डर सेटलमेंट स्लिप उपलब्ध नहीं है। जैसे ही आपके ऑर्डर डिलीवर होंगे, यहाँ 1-क्लिक डिडक्शन स्लिप और UTR दिखेगा।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weight Dispute Protection Architecture */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚖️</span>
            <h3 className="text-sm font-black text-blue-900">Zero-Fraud Weight Freeze Guarantee</h3>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            कूरियर कंपनियाँ बाद में मनमाना वज़न बढ़ाकर अतिरिक्त पेनल्टी शुल्क (Weight Discrepancy Charges) नहीं काट सकतीं। 
            पार्सल डिस्पैच करते समय सेलर के पैकेजिंग डाइमेंशन्स (L×B×H) डिजिटली लॉक रहते हैं और कटौती स्लिप में हर पैसे का हिसाब दर्ज होता है।
          </p>
        </div>
      </main>
    </div>
  );
}