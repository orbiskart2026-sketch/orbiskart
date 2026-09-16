'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SellerSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [profile, setProfile] = useState({
    store_name: '',
    contact_number: '',
    business_email: '',
    store_address: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
  });

  useEffect(() => {
    // सेलर डेटा फेच करना
    const token = localStorage.getItem('access_token');
    fetch('https://orbiskart.onrender.com/api/seller/profile/', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setProfile({
            store_name: data.store_name || '',
            contact_number: data.contact_number || '',
            business_email: data.business_email || '',
            store_address: data.store_address || '',
            bank_name: data.banking?.bank_name !== 'N/A' ? data.banking?.bank_name : '',
            bank_account_name: data.banking?.bank_account_name || '',
            bank_account_number: '',
            bank_ifsc_code: data.banking?.ifsc !== 'N/A' ? data.banking?.ifsc : '',
          });
        }
      })
      .catch(() => null)
      .finally(() => setFetching(false));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('https://orbiskart.onrender.com/api/seller/profile/update/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('✓ आपकी सेलर दुकान एवं बैंक खाता विवरण सफलतापूर्वक अपडेट कर दिया गया है!');
      } else {
        alert(`अपडेट विफल: ${data.error || 'त्रुटि'}`);
      }
    } catch {
      alert('सर्वर से संपर्क नहीं हो सका।');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="min-h-screen bg-slate-950 text-center py-20 text-slate-400">प्रोफ़ाइल लोड हो रही है...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-indigo-400">सेलर प्रोफ़ाइल व बैंक सेटिंग्स बदलें</h1>
            <p className="text-xs text-slate-400">दुकान का नाम, पता या बैंक खाता जब चाहें तुरंत अपडेट करें।</p>
          </div>
          <Link href="/seller" className="text-xs text-indigo-400 hover:underline">
            ← सेलर हब
          </Link>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">दुकान / कंपनी का नाम</label>
            <input
              type="text"
              value={profile.store_name}
              onChange={(e) => setProfile({ ...profile, store_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">दुकान / वेयरहाउस का नया पता</label>
            <textarea
              rows={2}
              value={profile.store_address}
              onChange={(e) => setProfile({ ...profile, store_address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
            />
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="font-bold text-amber-400 mb-3">नया बैंक खाता सेटलमेंट विवरण</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">बैंक का नाम</label>
                <input
                  type="text"
                  value={profile.bank_name}
                  onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                  placeholder="State Bank of India"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">IFSC कोड</label>
                <input
                  type="text"
                  value={profile.bank_ifsc_code}
                  onChange={(e) => setProfile({ ...profile, bank_ifsc_code: e.target.value.toUpperCase() })}
                  placeholder="SBIN0001234"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white uppercase"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">नया बैंक खाता नंबर</label>
                <input
                  type="password"
                  value={profile.bank_account_number}
                  onChange={(e) => setProfile({ ...profile, bank_account_number: e.target.value })}
                  placeholder="बदलने के लिए नया खाता नंबर दर्ज करें"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-white transition mt-4"
          >
            {loading ? 'अपडेट हो रहा है...' : 'सुरक्षित रूप से विवरण अपडेट करें'}
          </button>
        </form>
      </div>
    </div>
  );
}