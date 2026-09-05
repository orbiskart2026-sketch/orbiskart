'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  return createClient(url, key);
};

export default function UnifiedMasterAdmin() {
  const [auth, setAuth] = useState(false);
  const [view, setView] = useState<'login' | 'reset'>('login');
  
  // लॉगिन फ़ील्ड्स
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // पासवर्ड रीसेट फ़ील्ड्स
  const [recoveryPin, setRecoveryPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // डिफ़ॉल्ट रिकवरी मास्टर पिन (आपातकाल के लिए)
  const MASTER_RECOVERY_PIN = '123456';

  // स्थानीय स्टोरेज से पासवर्ड लोड/सेट करना
  useEffect(() => {
    if (!localStorage.getItem('orbiskart_admin_user')) {
      localStorage.setItem('orbiskart_admin_user', 'admin');
    }
    if (!localStorage.getItem('orbiskart_admin_pass')) {
      localStorage.setItem('orbiskart_admin_pass', 'admin123'); // आसान डिफ़ॉल्ट
    }
  }, []);

  const [tab, setTab] = useState<'audit' | 'sellers' | 'orders' | 'charges'>('audit');
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([
    {
      id: 'SEL-101',
      store_name: 'Orbis Kart Mart',
      owner: 'Store Admin',
      email: 'orbiskart2026@gmail.com',
      mobile: '+91 9876543210',
      gstin: '20AAAAA0000A1Z5',
      udyam: 'UDYAM-JH-00-0000000',
      bank_acc: '50100234567890',
      ifsc: 'HDFC0001234',
      status: 'Verified',
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const savedUser = localStorage.getItem('orbiskart_admin_user') || 'admin';
    const savedPass = localStorage.getItem('orbiskart_admin_pass') || 'admin123';

    if (username === savedUser && password === savedPass) {
      setAuth(true);
      setError('');
      fetchLedger();
    } else {
      setError('गलत ID या पासवर्ड! यदि भूल गए हैं तो नीचे "पासवर्ड रीसेट करें" पर क्लिक करें।');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryPin !== MASTER_RECOVERY_PIN) {
      setError('अमान्य रिकवरी पिन! (डिफ़ॉल्ट पिन 123456 है)');
      return;
    }
    if (newPassword.length < 4) {
      setError('पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('दोनों पासवर्ड मेल नहीं खा रहे हैं।');
      return;
    }

    localStorage.setItem('orbiskart_admin_pass', newPassword);
    setError('');
    setSuccessMsg('पासवर्ड सफलतापूर्वक बदल दिया गया! अब लॉगिन करें।');
    setView('login');
    setPassword('');
    setRecoveryPin('');
    setNewPassword('');
    setConfirmPassword('');
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

  const totalGross = ledgers.reduce((a, b) => a + Number(b.gross_amount || 0), 0);
  const totalPlatformEarned = ledgers.reduce((a, b) => a + Number(b.platform_fee || 0), 0);
  const totalGST = ledgers.reduce((a, b) => a + Number(b.gst_tax || 0), 0);
  const totalSellerPayout = ledgers.reduce((a, b) => a + Number(b.net_seller_payout || 0), 0);

  if (!auth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white tracking-wide">OrbisKart Control Center</h2>
            <p className="text-slate-400 text-xs mt-1">Multi-Vendor • Logistics • Financial Ledger</p>
          </div>

          {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-xs font-medium">{error}</div>}
          {successMsg && <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium">{successMsg}</div>}

          {/* लॉगिन व्यू */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">एडमिन आईडी (Username)</label>
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
                <label className="text-xs text-slate-300 font-semibold block mb-1">पासवर्ड</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="पासवर्ड दर्ज करें..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition"
              >
                लॉगिन करें
              </button>

              <div className="flex justify-between items-center pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setView('reset'); setError(''); setSuccessMsg(''); }}
                  className="text-indigo-400 hover:underline"
                >
                  पासवर्ड भूल गए? (Reset)
                </button>
                <span className="text-slate-500">डिफ़ॉल्ट ID: admin / Pass: admin123</span>
              </div>
            </form>
          )}

          {/* पासवर्ड रीसेट व्यू */}
          {view === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">मास्टर रिकवरी पिन</label>
                <input
                  type="password"
                  value={recoveryPin}
                  onChange={(e) => setRecoveryPin(e.target.value)}
                  placeholder="डिफ़ॉल्ट पिन: 123456"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">नया पासवर्ड बनाएँ</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="नया पासवर्ड दर्ज करें..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">नया पासवर्ड दोबारा दर्ज करें</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="पुष्टि करें..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition"
              >
                नया पासवर्ड सुरक्षित करें
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← लॉगिन पर वापस जाएँ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">OrbisKart Unified Admin</h1>
          <p className="text-xs text-slate-400">विक्रेता ऑडिट • कूरियर ट्रैकिंग • लेजर एवं नीतियां</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://orbiskart.onrender.com/admin"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs font-semibold"
          >
            Django Panel ↗
          </a>
          <button onClick={() => setAuth(false)} className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-xs font-semibold">
            लॉगआउट
          </button>
        </div>
      </header>

      {/* नेविगेशन टैब्स */}
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
                  <th className="p-3">GSTIN / Udyam</th>
                  <th className="p-3">बैंक विवरण</th>
                  <th className="p-3">सत्यापन स्थिति</th>
                  <th className="p-3">कमीशन</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sellers.map((s) => (
                  <tr key={s.id}>
                    <td className="p-3">
                      <div className="font-bold text-white">{s.store_name}</div>
                      <div className="text-slate-400">{s.owner} • {s.mobile}</div>
                    </td>
                    <td className="p-3 font-mono">
                      <div>GST: {s.gstin}</div>
                      <div className="text-slate-400 text-[10px]">Udyam: {s.udyam}</div>
                    </td>
                    <td className="p-3 font-mono">
                      <div>A/C: {s.bank_acc}</div>
                      <div className="text-emerald-400 text-[10px]">IFSC: {s.ifsc}</div>
                    </td>
                    <td className="p-3">
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">
                        सत्यापित (Verified)
                      </span>
                    </td>
                    <td className="p-3 font-bold text-indigo-400">{s.commission_rate}%</td>
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
                <div className="text-xs text-slate-400">कूरियर पार्टनर</div>
                <div className="text-lg font-bold text-white mt-1">Delhivery / Shiprocket</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400">OTP-आधारित डिलीवरी</div>
                <div className="text-lg font-bold text-white mt-1">सक्रिय (Anti-Fraud)</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400">रिटर्न कूरियर पेनल्टी</div>
                <div className="text-lg font-bold text-amber-400 mt-1">₹{config.return_penalty} / ऑर्डर</div>
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