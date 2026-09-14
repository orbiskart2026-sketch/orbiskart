'use client';

import { useState } from 'react';

const UTILITY_SERVICES = [
  { id: 'RECHARGE', name: 'Mobile Recharge', icon: '📱' },
  { id: 'ELECTRICITY', name: 'Electricity Bill', icon: '⚡' },
  { id: 'GAS_BOOKING', name: 'Gas Cylinder', icon: '🔥' },
  { id: 'DTH', name: 'DTH / Cable TV', icon: '📺' },
  { id: 'LOAN_REPAYMENT', name: 'Loan EMI Pay', icon: '🏦' },
  { id: 'FASTAG', name: 'FASTag Recharge', icon: '🚗' },
];

export default function OrbisKartPayHub() {
  const [selectedService, setSelectedService] = useState('RECHARGE');
  const [consumerId, setConsumerId] = useState('');
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const res = await fetch('/api/pay/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: selectedService,
          consumer_id: consumerId,
          amount: amount,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`भुगतान सफल! UTR / Ref ID: ${data.operator_ref}`);
        setAmount('');
        setConsumerId('');
      } else {
        alert(data.error || 'भुगतान विफल रहा');
      }
    } catch (err) {
      alert('सर्वर से संपर्क नहीं हो सका');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="border-b border-slate-800 pb-4 mb-6">
          <h1 className="text-2xl font-black text-blue-500 uppercase flex items-center gap-2">
            <span>⚡</span> OrbisKart Pay & Financial Services
          </h1>
          <p className="text-xs text-slate-400">
            BBPS Powered • 100% Instant Bank Settlement • Zero-Downtime Guarantee
          </p>
        </header>

        {/* Service Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {UTILITY_SERVICES.map((srv) => (
            <button
              key={srv.id}
              onClick={() => setSelectedService(srv.id)}
              className={`p-4 rounded-xl border text-center transition flex flex-col items-center justify-center gap-2 ${
                selectedService === srv.id
                  ? 'border-blue-500 bg-blue-950/40 text-white ring-1 ring-blue-500'
                  : 'border-slate-800 bg-[#0f172a] text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="text-2xl">{srv.icon}</span>
              <span className="text-[11px] font-bold">{srv.name}</span>
            </button>
          ))}
        </div>

        {/* Payment Form */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-black uppercase text-white mb-4">
            {selectedService} का तुरंत भुगतान करें
          </h2>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Consumer Number / Mobile / Account ID *
              </label>
              <input
                type="text"
                value={consumerId}
                onChange={(e) => setConsumerId(e.target.value)}
                placeholder="उदा. उपभोक्ता संख्या / मोबाइल नंबर"
                className="w-full text-xs p-3 rounded-lg bg-[#070b14] border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">राशि (₹) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ 0.00"
                className="w-full text-xs p-3 rounded-lg bg-[#070b14] border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={processing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition text-xs uppercase tracking-wider"
            >
              {processing ? 'प्रोसेसिंग...' : 'तुरंत भुगतान करें ⚡'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}