'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminAuditPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const ADMIN_PASSCODE = 'OrbisKart@Audit2026';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      setError('');
      fetchLedgerData();
    } else {
      setError('गलत पासवर्ड! कृपया सही पासकोड दर्ज करें।');
    }
  };

  const fetchLedgerData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_ledgers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setLedgers(data || []);
    }
    setLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white tracking-wide">OrbisKart Admin</h1>
            <p className="text-slate-400 text-sm mt-1">Financial Reconciliation Engine</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                एडमिन सुरक्षा की (Passcode)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="पासकोड दर्ज करें..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition duration-200 shadow-lg shadow-indigo-600/30"
            >
              लेजर डैशबोर्ड खोलें
            </button>
          </form>
          <p className="text-center text-xs text-slate-500 mt-6">
            डिफ़ॉल्ट पासकोड: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">OrbisKart@Audit2026</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white">वित्तीय रीकंसीलिएशन लेजर</h1>
            <p className="text-slate-400 text-sm mt-1">Supabase रियल-टाइम ऑडिट डैशबोर्ड</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchLedgerData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition border border-slate-700"
            >
              🔄 रीफ्रेश करें
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-semibold rounded-lg transition border border-red-500/20"
            >
              लॉगआउट
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 uppercase font-semibold">कुल ट्रांजेक्शन</span>
            <p className="text-2xl font-bold text-white mt-1">{ledgers.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 uppercase font-semibold">कुल ग्रॉस राशि</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              ₹{ledgers.reduce((acc, row) => acc + Number(row.gross_amount || 0), 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 uppercase font-semibold">कुल GST (18%)</span>
            <p className="text-2xl font-bold text-indigo-400 mt-1">
              ₹{ledgers.reduce((acc, row) => acc + Number(row.gst_tax || 0), 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 uppercase font-semibold">कुल सेलर पेआउट</span>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              ₹{ledgers.reduce((acc, row) => acc + Number(row.net_seller_payout || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400">डेटा लोड हो रहा है...</div>
          ) : ledgers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">अभी कोई ऑडिट रिकॉर्ड दर्ज नहीं है।</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-3">तारीख / ID</th>
                  <th className="p-3">ग्राहक</th>
                  <th className="p-3 text-right">ग्रॉस राशि</th>
                  <th className="p-3 text-right">गेटवे फ़ी (2%)</th>
                  <th className="p-3 text-right">प्लेटफ़ॉर्म फ़ी (3%)</th>
                  <th className="p-3 text-right">शिपिंग</th>
                  <th className="p-3 text-right">GST</th>
                  <th className="p-3 text-right font-bold text-emerald-400">नेट पेआउट</th>
                  <th className="p-3">AWB / OTP</th>
                  <th className="p-3 text-center">स्थिति</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {ledgers.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 whitespace-nowrap">
                      <div>{new Date(row.created_at).toLocaleDateString('en-IN')}</div>
                      <span className="font-mono text-slate-500 text-[10px]">{row.order_id}</span>
                    </td>
                    <td className="p-3">
                      <div>{row.customer_email || 'N/A'}</div>
                      <div className="text-slate-500">{row.customer_contact || 'N/A'}</div>
                    </td>
                    <td className="p-3 text-right font-semibold text-white">₹{row.gross_amount}</td>
                    <td className="p-3 text-right text-red-400">-₹{row.gateway_fee}</td>
                    <td className="p-3 text-right text-red-400">-₹{row.platform_fee}</td>
                    <td className="p-3 text-right text-red-400">-₹{row.shipping_fee}</td>
                    <td className="p-3 text-right text-indigo-400">₹{row.gst_tax}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">₹{row.net_seller_payout}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-mono text-slate-300">AWB: {row.awb_number}</div>
                      <div className="text-amber-400 font-mono">OTP: {row.delivery_otp}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {row.reconciliation_status || 'Reconciled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}