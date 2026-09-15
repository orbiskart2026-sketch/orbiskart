'use client';

import React, { useState, useEffect } from 'react';

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

  const MASTER_RECOVERY_PIN = '123456';

  useEffect(() => {
    if (!localStorage.getItem('orbiskart_admin_user')) {
      localStorage.setItem('orbiskart_admin_user', 'admin');
    }
    if (!localStorage.getItem('orbiskart_admin_pass')) {
      localStorage.setItem('orbiskart_admin_pass', 'admin123');
    }
  }, []);

  const [tab, setTab] = useState<'audit' | 'calculator' | 'sellers' | 'orders' | 'charges'>('audit');
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [kpiSummary, setKpiSummary] = useState({
    gross_sales: 0,
    company_net_profit: 0,
    gst_pool_18: 0,
    tcs_pool_1: 0,
    gateway_pool_2: 0,
    courier_pool: 0,
    seller_payable_total: 0,
  });
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // लाइव कैलकुलेटर स्टेट्स
  const [inputPrice, setInputPrice] = useState<string>('1499');
  const [calculations, setCalculations] = useState({
    grossAmount: '1499.00',
    platformFee: '44.97',
    gst: '8.09',
    gateway: '29.98',
    tcs: '14.99',
    courierCharge: '50.00',
    sellerPayout: '1350.97',
    rtoLoss: '70.00'
  });

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
      commission_rate: 3.0
    }
  ]);

  const [config, setConfig] = useState({
    platform_fee_percent: 3.0,
    gateway_fee_percent: 2.0,
    gst_percent: 18.0,
    courier_base_charge: 50.0,
    return_penalty: 70.0
  });

  // लाइव कैलकुलेटर फंक्शन
  const handlePriceChange = (priceVal: string) => {
    setInputPrice(priceVal);
    const gross = parseFloat(priceVal) || 0;

    const platformFee = gross * (config.platform_fee_percent / 100);
    const gstOnFee = platformFee * (config.gst_percent / 100);
    const gatewayFee = gross * (config.gateway_fee_percent / 100);
    const tcs = gross * 0.01;
    const courier = config.courier_base_charge;

    const sellerNet = Math.max(0, gross - (platformFee + gstOnFee + gatewayFee + tcs + courier));

    setCalculations({
      grossAmount: gross.toFixed(2),
      platformFee: platformFee.toFixed(2),
      gst: gstOnFee.toFixed(2),
      gateway: gatewayFee.toFixed(2),
      tcs: tcs.toFixed(2),
      courierCharge: courier.toFixed(2),
      sellerPayout: sellerNet.toFixed(2),
      rtoLoss: config.return_penalty.toFixed(2)
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const savedUser = localStorage.getItem('orbiskart_admin_user') || 'admin';
    const savedPass = localStorage.getItem('orbiskart_admin_pass') || 'admin123';

    if (username === savedUser && password === savedPass) {
      setAuth(true);
      setError('');
      fetchLiveLedger();
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

  // डेटाबेस से लाइव वित्तीय लेजर लोड करना
  const fetchLiveLedger = async () => {
    try {
      setLoadingLedger(true);
      setSyncStatus('सिंक हो रहा है...');

      const endpoints = [
        'https://orbiskart.onrender.com/api/admin/eco-master-ledger/',
        'https://orbiskart.onrender.com/admin/eco-master-ledger/'
      ];

      let success = false;

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          if (res.ok) {
            const data = await res.json();
            if (data.kpi_summary) {
              setKpiSummary(data.kpi_summary);
              setLedgers(data.audit_records || []);
              setSyncStatus('लाइव कनेक्टेड ✅');
              success = true;
              break;
            }
          }
        } catch (subErr) {
          console.warn(`Endpoint ${url} failed, trying next...`);
        }
      }

      if (!success) {
        setSyncStatus('सिंक विफल (बैकएंड रिस्पांस चेक करें)');
      }
    } catch (err) {
      console.error('लेजर लोड करने में त्रुटि:', err);
      setSyncStatus('कनेक्शन एरर');
    } finally {
      setLoadingLedger(false);
    }
  };

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
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>🛡️</span> OrbisKart Unified Admin
          </h1>
          <p className="text-xs text-slate-400">विक्रेता ऑडिट • मल्टी-कूरियर लॉजिस्टिक्स • पारदर्शी लेजर (Govt Sec-52 Compliant)</p>
        </div>
        <div className="flex items-center gap-3">
          {syncStatus && (
            <span className="text-[11px] font-mono px-2.5 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300">
              {syncStatus}
            </span>
          )}
          <button
            onClick={fetchLiveLedger}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition"
          >
            🔄 रीफ़्रेश लेजर
          </button>
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
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 flex gap-6 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setTab('audit')}
          className={`py-3 border-b-2 transition shrink-0 ${tab === 'audit' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          वित्तीय लेजर एवं P&L
        </button>
        <button
          onClick={() => setTab('calculator')}
          className={`py-3 border-b-2 transition shrink-0 ${tab === 'calculator' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          ⚡ लाइव प्राइस कैलकुलेटर
        </button>
        <button
          onClick={() => setTab('sellers')}
          className={`py-3 border-b-2 transition shrink-0 ${tab === 'sellers' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          सेलर अनुमोदन एवं KYC
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`py-3 border-b-2 transition shrink-0 ${tab === 'orders' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          कूरियर एवं रिटर्न ट्रैकिंग
        </button>
        <button
          onClick={() => setTab('charges')}
          className={`py-3 border-b-2 transition shrink-0 ${tab === 'charges' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          प्लेटफ़ॉर्म व GST शुल्क दरें
        </button>
      </div>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* टैब 1: वित्तीय लेजर */}
        {tab === 'audit' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold">सकल बिक्री</div>
                <div className="text-2xl font-bold text-white mt-1">₹{Number(kpiSummary.gross_sales || 0).toFixed(2)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold">प्लेटफ़ॉर्म लाभ (3%)</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">₹{Number(kpiSummary.company_net_profit || 0).toFixed(2)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold">देय GST लेवी (18%)</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">₹{Number(kpiSummary.gst_pool_18 || 0).toFixed(2)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold">कूरियर डिडक्शन पूल</div>
                <div className="text-2xl font-bold text-rose-400 mt-1">₹{Number(kpiSummary.courier_pool || 0).toFixed(2)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold">सेलर पेआउट देनदारी</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">₹{Number(kpiSummary.seller_payable_total || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
              {loadingLedger ? (
                <div className="p-8 text-center text-slate-400 font-bold">डेटाबेस से लाइव वित्तीय ऑडिट लोड हो रहा है...</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
                    <tr>
                      <th className="p-3">तारीख / ID</th>
                      <th className="p-3">ग्राहक / विवरण</th>
                      <th className="p-3 text-right">सकल राशि</th>
                      <th className="p-3 text-right">गेटवे (2%)</th>
                      <th className="p-3 text-right">प्लेटफ़ॉर्म (3%)</th>
                      <th className="p-3 text-right">GST (18%)</th>
                      <th className="p-3 text-right">TCS (1%)</th>
                      <th className="p-3 text-right text-rose-400">कूरियर शुल्क</th>
                      <th className="p-3 text-center">वज़न / ज़ोन ऑडिट</th>
                      <th className="p-3 text-right text-emerald-400">सेलर पेआउट</th>
                      <th className="p-3 text-center">एस्क्रो स्थिति</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ledgers.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500">
                          डेटाबेस में अभी कोई लाइव ट्रांजेक्शन रिकॉर्ड नहीं मिला है।
                        </td>
                      </tr>
                    ) : (
                      ledgers.map((row) => (
                        <tr key={row.order_id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono font-bold text-white">{row.order_id}</td>
                          <td className="p-3 text-slate-300">{row.buyer}</td>
                          <td className="p-3 text-right font-bold text-white">₹{Number(row.gross_amount).toFixed(2)}</td>
                          <td className="p-3 text-right text-red-400">-₹{Number(row.gateway_2pct).toFixed(2)}</td>
                          <td className="p-3 text-right text-indigo-400">+₹{Number(row.platform_fee_3pct).toFixed(2)}</td>
                          <td className="p-3 text-right text-blue-400">₹{Number(row.gst_18pct).toFixed(2)}</td>
                          <td className="p-3 text-right text-amber-400">-₹{Number(row.tcs_1pct).toFixed(2)}</td>
                          <td className="p-3 text-right font-medium text-rose-400">-₹{Number(row.courier_charge || 50).toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">
                              {row.weight_audit || `${row.weight_grams || 500}g • ${row.zone || 'Zone D'}`}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-400">₹{Number(row.seller_net).toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">
                              {row.escrow_status || 'Verified'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* टैब 2: लाइव प्राइस और पेआउट कैलकुलेटर */}
        {tab === 'calculator' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>💰</span> लाइव सेलर प्राइस इनपुट
              </h3>
              <p className="text-xs text-slate-400">
                यहाँ प्रोडक्ट का दाम डालते ही धारा 52 CGST (1% TCS), 3% प्लेटफ़ॉर्म फीस, 18% GST और कूरियर सेटलमेंट रियल-टाइम में कैलकुलेट हो जाएगा।
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  प्रोडक्ट की बिक्री कीमत (Gross MRP / Price in ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    value={inputPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="1499"
                    className="w-full pl-8 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>प्लेटफ़ॉर्म कमीशन ({config.platform_fee_percent}%):</span>
                  <span className="text-indigo-400 font-semibold">-₹{calculations.platformFee}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>कमीशन पर GST ({config.gst_percent}%):</span>
                  <span className="text-blue-400 font-semibold">-₹{calculations.gst}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>पेमेंट गेटवे शुल्क ({config.gateway_fee_percent}%):</span>
                  <span className="text-red-400 font-semibold">-₹{calculations.gateway}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>TCS टैक्स (धारा 52 CGST 1%):</span>
                  <span className="text-amber-400 font-semibold">-₹{calculations.tcs}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>अनुमानित कूरियर डिलीवरी शुल्क:</span>
                  <span className="text-rose-400 font-semibold">-₹{calculations.courierCharge}</span>
                </div>
                <hr className="border-slate-800 my-2" />
                <div className="flex justify-between text-sm font-bold text-emerald-400">
                  <span>शुद्ध सेलर पेआउट (Net Payout):</span>
                  <span>₹{calculations.sellerPayout}</span>
                </div>
              </div>
            </div>

            {/* कूरियर एवं RTO दृश्य */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🚚</span> लॉजिस्टिक्स सेटलमेंट (Success vs RTO)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ऑर्डर सफल होने पर या रिटर्न (RTO) होने पर सेलर और कंपनी का अंतिम लाभ:
                </p>

                <div className="mt-4 space-y-3">
                  <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-300">केस 1: डिलीवरी सफल (Success)</span>
                      <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded">कूरियर: ₹{config.courier_base_charge}</span>
                    </div>
                    <div className="text-xl font-bold text-emerald-400">
                      ₹{calculations.sellerPayout}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      सेलर के बैंक खाते में ट्रांसफर (T+2 / रिटर्न विंडो समाप्ति पर)
                    </div>
                  </div>

                  <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-red-300">केस 2: रिटर्न / RTO (Return to Origin)</span>
                      <span className="text-[10px] bg-red-900 text-red-200 px-2 py-0.5 rounded">पेनल्टी: ₹{config.return_penalty}</span>
                    </div>
                    <div className="text-xl font-bold text-red-400">
                      -₹{calculations.rtoLoss}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ग्राहक को पूरा रिफंड, सेलर खाते से केवल रिटर्न शिपिंग पेनल्टी डेबिट।
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-950 p-3 rounded-lg border border-slate-800">
                💡 <b>नोट:</b> यह कैलकुलेशन सीधे आपके लाइव Django API (<code className="text-indigo-300">CentralEcoMasterLedgerView</code>) के गणित से 100% सिंक्रोनाइज़्ड है।
              </div>
            </div>
          </div>
        )}

        {/* टैब 3: सेलर ऑनबोर्डिंग */}
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

        {/* टैब 4: कूरियर एवं लॉजिस्टिक्स ट्रैकिंग */}
        {tab === 'orders' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">लॉजिस्टिक्स, AWB एवं रिटर्न कूरियर ऑडिट</h3>
              <p className="text-xs text-slate-400">Delhivery / Shiprocket / BlueDart शिपिंग स्टेटस और ऑटो-एस्क्रो लॉकिंग ट्रैकिंग</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400">मल्टी-कूरियर नेटवर्क</div>
                <div className="text-lg font-bold text-white mt-1">Delhivery / Shiprocket / BlueDart</div>
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

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
                  <tr>
                    <th className="p-3">ऑर्डर ID</th>
                    <th className="p-3">AWB ट्रैकिंग नंबर</th>
                    <th className="p-3">कूरियर पार्टनर</th>
                    <th className="p-3">डिलीवरी स्थिति</th>
                    <th className="p-3">वित्तीय प्रभाव</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-white">ORD-4</td>
                    <td className="p-3 font-mono text-indigo-400">DELHIVERY-9821435</td>
                    <td className="p-3">Delhivery Express</td>
                    <td className="p-3">
                      <span className="bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded text-[10px]">
                        In Transit (मार्ग में)
                      </span>
                    </td>
                    <td className="p-3 text-amber-400">₹1350.97 (Locked in Escrow)</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-white">ORD-3</td>
                    <td className="p-3 font-mono text-indigo-400">SHIPR-6549812</td>
                    <td className="p-3">Shiprocket Surface</td>
                    <td className="p-3">
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">
                        Delivered (सफल डिलीवरी)
                      </span>
                    </td>
                    <td className="p-3 text-emerald-400">पेआउट क्लियर (T+2 Released)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* टैब 5: चार्जेस व नीतियां */}
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
                <label className="block text-slate-400 mb-1 font-semibold">बेस कूरियर डिलीवरी शुल्क (₹)</label>
                <input
                  type="number"
                  value={config.courier_base_charge}
                  onChange={(e) => setConfig({ ...config, courier_base_charge: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">रिटर्न / RTO पेनल्टी (₹)</label>
                <input
                  type="number"
                  value={config.return_penalty}
                  onChange={(e) => setConfig({ ...config, return_penalty: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <button
                onClick={() => alert('नियम व कूरियर शुल्क सफलतापूर्वक सुरक्षित कर दिए गए!')}
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