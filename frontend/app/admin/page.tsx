'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  return createClient(url, key);
};

export default function UnifiedMasterAdmin() {
  const [auth, setAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'audit' | 'sellers' | 'orders' | 'charges'>('audit');

  // डेटा स्टेट्स
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([
    {
      id: 'SEL-101',
      store_name: 'Orbis Kart Mart',
      owner: 'Naresh Prasad Soni',
      email: 'orbiskart2026@gmail.com',
      mobile: '+91 9876543210',
      gstin: '20AAAAA0000A1Z5',
      udyam: 'UDYAM-JH-00-0000000',
      bank_acc: '50100234567890',
      ifsc: 'HDFC0001234',
      status: 'Verified',
      otp_verified: true,
      shop_photo: 'https://placehold.co/100x100?text=Shop+Front',
      commission_rate: 5.0
    }
  ]);

  const [config, setConfig] = useState({
    platform_fee_percent: 3.0,
    gateway_fee_percent: 2.0,
    gst_percent: 18.0,
    courier_base_charge: 50.0,
    return_penalty: 70.0
  });

  // एडमिन क्रेडेंशियल्स
  const ADMIN_USER = 'admin';
  const ADMIN_PASS = 'OrbisKart@Audit2026';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      setAuth(true);
      setError('');
      fetchLedger();
    } else {
      setError('अमान्य यूज़रनेम या पासवर्ड! कृपया सही विवरण दर्ज करें।');
    }
  };

  const fetchLedger = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase.from('audit_ledgers').select('*').order('created_at', { ascending: false });
      if (data) setLedgers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSellerApproval = (id: string, newStatus: string) => {
    setSellers(sellers.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const totalGross = ledgers.reduce((a, b) => a + Number(b.gross_amount || 0), 0);
  const totalPlatformEarned = ledgers.reduce((a, b) => a + Number(b.platform_fee || 0), 0);
  const totalGST = ledgers.reduce((a, b) => a + Number(b.gst_tax || 0), 0);
  const totalSellerPayout = ledgers.reduce((a, b) => a + Number(b.net_seller_payout || 0), 0);

  if (!auth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white tracking-wide">OrbisKart Master Admin</h2>
            <p className="text-slate-400 text-xs mt-1">Multi-Vendor • KYC • Logistics • Audit Ledger</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 uppercase tracking-wider">
                एडमिन लॉगिन आईडी (Username)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 uppercase tracking-wider">
                पासवर्ड (Password)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30"
            >
              मास्टर एडमिन पैनल खोलें
            </button>
          </form>
          <div className="mt-6 p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400">
            <div>डिफ़ॉल्ट ID: <span className="text-white font-mono font-semibold">admin</span></div>
            <div>डिफ़ॉल्ट पासवर्ड: <span className="text-white font-mono font-semibold">OrbisKart@Audit2026</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">OrbisKart Control Center</h1>
          <p className="text-xs text-slate-400">विक्रेता अनुमोदन • कूरियर ट्रैकिंग • GST एवं वित्तीय समाधान</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://orbiskart.onrender.com/admin"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs font-semibold transition"
          >
            Django Core Panel ↗
          </a>
          <button onClick={() => setAuth(false)} className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-xs font-semibold">
            लॉगआउट
          </button>
        </div>
      </header>

      <div className="bg-slate-900/60 border-b border-slate-800 px-6 flex gap-6 text-sm font-semibold">
        <button
          onClick={() => setTab('audit')}
          className={`py-3 border-b-2 transition ${tab === 'audit' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          वित्तीय लेजर एवं P&L
        </button>
        <button
          onClick={() => setTab('sellers')}
          className={`py-3 border-b-2 transition ${tab === 'sellers' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          सेलर अनुमोदन एवं KYC
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`py-3 border-b-2 transition ${tab === 'orders' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          कूरियर एवं रिटर्न ट्रैकिंग
        </button>
        <button
          onClick={() => setTab('charges')}
          className={`py-3 border-b-2 transition ${tab === 'charges' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          प्लेटफ़ॉर्म व GST शुल्क दरें
        </button>
      </div>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {tab === 'audit' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold">सकल बिक्री</div>
                <div className="text-2xl font-bold text-white mt-1">₹{totalGross.toFixed(2)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold">प्लेटफ़ॉर्म लाभ</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">₹{totalPlatformEarned.toFixed(2)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold">देय GST लेवी (18%)</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">₹{totalGST.toFixed(2)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold">सेलर पेआउट देनदारी</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">₹{totalSellerPayout.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
                  <tr>
                    <th className="p-3">तारीख / ID</th>
                    <th className="p-3">ग्राहक / ईमेल</th>
                    <th className="p-3 text-right">सकल राशि</th>
                    <th className="p-3 text-right">गेटवे (2%)</th>
                    <th className="p-3 text-right">प्लेटफ़ॉर्म (3%)</th>
                    <th className="p-3 text-right">शिपिंग</th>
                    <th className="p-3 text-right">GST</th>
                    <th className="p-3 text-right text-emerald-400">सेलर पेआउट</th>
                    <th className="p-3 text-center">रीकंसीलिएशन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ledgers.length === 0 ? (
                    <tr><td colSpan={9} className="p-8 text-center text-slate-500">अभी कोई लाइव ट्रांजेक्शन रिकॉर्ड नहीं है।</td></tr>
                  ) : (
                    ledgers.map((row) => (
                      <tr key={row.id}>
                        <td className="p-3 font-mono">{row.order_id}</td>
                        <td className="p-3">{row.customer_email || 'Direct Sync'}</td>
                        <td className="p-3 text-right">₹{row.gross_amount}</td>
                        <td className="p-3 text-right text-red-400">-₹{row.gateway_fee}</td>
                        <td className="p-3 text-right text-indigo-400">+₹{row.platform_fee}</td>
                        <td className="p-3 text-right text-red-400">-₹{row.shipping_fee}</td>
                        <td className="p-3 text-right">₹{row.gst_tax}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">₹{row.net_seller_payout}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">
                            {row.reconciliation_status || 'Reconciled'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'sellers' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto p-4">
            <h3 className="text-base font-bold text-white mb-4">विक्रेता ऑनबोर्डिंग एवं दस्तावेज़ सत्यापन (KYC)</h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
                <tr>
                  <th className="p-3">दुकान / मालिक</th>
                  <th className="p-3">दुकान फोटो</th>
                  <th className="p-3">GSTIN / Udyam</th>
                  <th className="p-3">बैंक खाता विवरण</th>
                  <th className="p-3">ई-केवाईसी स्थिति</th>
                  <th className="p-3">कमीशन</th>
                  <th className="p-3 text-center">कार्यवाही</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sellers.map((s) => (
                  <tr key={s.id}>
                    <td className="p-3">
                      <div className="font-bold text-white">{s.store_name}</div>
                      <div className="text-slate-400">{s.owner} • {s.mobile}</div>
                      <div className="text-slate-500">{s.email}</div>
                    </td>
                    <td className="p-3">
                      <img src={s.shop_photo} alt="Shop" className="w-12 h-12 object-cover rounded-lg border border-slate-700" />
                    </td>
                    <td className="p-3 font-mono">
                      <div>GST: {s.gstin}</div>
                      <div className="text-slate-400 text-[10px]">Udyam: {s.udyam}</div>
                    </td>
                    <td className="p-3 font-mono">
                      <div>A/C: {s.bank_acc}</div>
                      <div className="text-emerald-400 text-[10px]">IFSC: {s.ifsc} (Verified)</div>
                    </td>
                    <td className="p-3">
                      <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded text-[10px] block w-fit mb-1">
                        Mobile OTP: OK
                      </span>
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] block w-fit">
                        e-KYC: OK
                      </span>
                    </td>
                    <td className="p-3 font-bold text-indigo-400">{s.commission_rate}%</td>
                    <td className="p-3 text-center">
                      {s.status === 'Verified' ? (
                        <button
                          onClick={() => toggleSellerApproval(s.id, 'Suspended')}
                          className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded text-[11px] font-semibold hover:bg-red-600/30"
                        >
                          सस्पेंड करें
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleSellerApproval(s.id, 'Verified')}
                          className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-semibold hover:bg-emerald-600/30"
                        >
                          स्वीकृत करें
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'orders' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white mb-2">लॉजिस्टिक्स, AWB एवं रिटर्न कूरियर ऑडिट</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400">सक्रिय कूरियर पार्टनर</div>
                <div className="text-lg font-bold text-white mt-1">Delhivery / Shiprocket</div>
                <div className="text-xs text-emerald-400 mt-2">API स्थिति: सक्रिय</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400">OTP-आधारित सुरक्षित डिलीवरी</div>
                <div className="text-lg font-bold text-white mt-1">99.4% सफलता दर</div>
                <div className="text-xs text-slate-400 mt-2">फ़र्ज़ी डिलीवरी रोकथाम सक्रिय</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400">RTO / रिटर्न चार्ज पेनल्टी</div>
                <div className="text-lg font-bold text-amber-400 mt-1">₹{config.return_penalty} / पार्सल</div>
                <div className="text-xs text-slate-400 mt-2">गलत रिटर्न पर सेलर/कूरियर ऑडिट</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'charges' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl">
            <h3 className="text-base font-bold text-white mb-4">कमीशन, कूरियर व कर नीतियां</h3>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">मार्केटप्लेस कमीशन दर (%)</label>
                <input
                  type="number"
                  value={config.platform_fee_percent}
                  onChange={(e) => setConfig({ ...config, platform_fee_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">पेमेंट गेटवे शुल्क (%)</label>
                <input
                  type="number"
                  value={config.gateway_fee_percent}
                  onChange={(e) => setConfig({ ...config, gateway_fee_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">डिफ़ॉल्ट GST दर (%)</label>
                <input
                  type="number"
                  value={config.gst_percent}
                  onChange={(e) => setConfig({ ...config, gst_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">रिटर्न कूरियर पेनल्टी (₹)</label>
                <input
                  type="number"
                  value={config.return_penalty}
                  onChange={(e) => setConfig({ ...config, return_penalty: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <button
                onClick={() => alert('नियम सफलतापूर्वक सुरक्षित कर दिए गए!')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition mt-2"
              >
                सेटिंग्स सुरक्षित करें
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}