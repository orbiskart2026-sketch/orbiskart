'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';

export default function SellerLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.access) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('is_seller', 'true');
        localStorage.setItem('seller_username', username);
        alert('✔ सेलर लॉगिन सफल! सेलर हब में स्वागत है।');
        router.push('/seller');
      } else {
        setError(data.detail || 'अमान्य यूजरनेम या पासवर्ड!');
      }
    } catch {
      setError('सर्वर से कनेक्ट करने में विफल');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-indigo-400">OrbisKart Seller Login</h1>
          <p className="text-xs text-slate-400 mt-1">अपने सेलर क्रेडेंशियल्स दर्ज करके सीधे दुकान खोलें</p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 text-xs p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-bold">User ID / Username *</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="उदा. nareshprasadsoni1992 या orbis_kart"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-bold">पासवर्ड (Password) *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="अपना सेलर पासवर्ड दर्ज करें"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'लॉगिन हो रहा है...' : 'सेलर हब में लॉगिन करें 🚀'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          नई दुकान शुरू करनी है?{' '}
          <Link href="/seller/register" className="text-indigo-400 hover:underline font-bold">
            यहाँ रजिस्टर करें
          </Link>
        </div>
      </div>
    </div>
  );
}