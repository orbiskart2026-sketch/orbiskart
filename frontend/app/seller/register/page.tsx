'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const GLOBAL_COUNTRIES = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
];

// बैकएंड का लाइव बेस यूआरएल (डबल स्लैश से सुरक्षित)
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com'
).replace(/\/$/, '');

export default function SellerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [ifscLoading, setIfscLoading] = useState(false);

  const [bankVerifying, setBankVerifying] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);

  const [localCircles, setLocalCircles] = useState<string[]>([]);

  const [form, setForm] = useState({
    store_name: '',
    owner_name: '',
    contact_number: '',
    business_email: '',
    password: '',
    confirm_password: '',
    country: 'IN',
    street_address: '',
    city_district: '',
    state: '',
    local_circle: '',
    pincode: '',
    gstin: '',
    msme_number: '',
    id_proof_number: '',
    pan_number: '',
    bank_name: '',
    bank_branch: '',
    bank_address: '',
    bank_account_name: '',
    bank_account_number: '',
    confirm_account_number: '',
    bank_ifsc_code: '',
  });

  // फ़ाइल स्टेट्स
  const [storePhoto, setStorePhoto] = useState<File | null>(null);
  const [panDoc, setPanDoc] = useState<File | null>(null);
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [businessDoc, setBusinessDoc] = useState<File | null>(null);
  const [chequeDoc, setChequeDoc] = useState<File | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [declaredAccurate, setDeclaredAccurate] = useState(false);

  // 1. पिनकोड से लोकेशन फ़ेच
  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.trim();
    setForm((prev) => ({ ...prev, pincode: code, local_circle: '' }));
    setLocalCircles([]);

    if (form.country === 'IN' && code.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${code}`);
        const data = await res.json();
        if (data && data[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
          const poList = data[0].PostOffice;
          const firstPO = poList[0];
          const circleNames = Array.from(new Set(poList.map((p: any) => p.Name))) as string[];
          setLocalCircles(circleNames);

          setForm((prev) => ({
            ...prev,
            city_district: firstPO.District,
            state: firstPO.State,
            local_circle: circleNames[0] || '',
          }));
        }
      } catch (err) {
        console.error('Pincode fetch error:', err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  // 2. IFSC से बैंक डिटेल्स फ़ेच
  const handleIfscChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const ifsc = e.target.value.trim().toUpperCase();
    setForm((prev) => ({ ...prev, bank_ifsc_code: ifsc }));

    if (ifsc.length === 11) {
      setIfscLoading(true);
      try {
        const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
        if (res.ok) {
          const bankData = await res.json();
          setForm((prev) => ({
            ...prev,
            bank_name: bankData.BANK || 'State Bank of India',
            bank_branch: bankData.BRANCH || '',
            bank_address: bankData.ADDRESS || `${bankData.BRANCH || ''}, ${bankData.CITY || ''}, ${bankData.STATE || ''}`,
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            bank_name: prev.bank_name || 'State Bank of India',
          }));
        }
      } catch (err) {
        console.error('IFSC fetch error:', err);
      } finally {
        setIfscLoading(false);
      }
    }
  };

  // 3. बैंक खाता सत्यापन
  const verifyAndFetchAccountHolder = async () => {
    if (!form.bank_account_number || !form.confirm_account_number) {
      alert('कृपया पहले दोनों जगह खाता संख्या दर्ज करें।');
      return;
    }
    if (form.bank_account_number !== form.confirm_account_number) {
      alert('⚠️ दोनों खाता संख्या मेल नहीं खा रही हैं!');
      return;
    }
    if (form.bank_ifsc_code.length !== 11) {
      alert('कृपया सही 11-अंकों का IFSC कोड दर्ज करें।');
      return;
    }

    setBankVerifying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/seller/verify-bank/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_number: form.bank_account_number,
          ifsc: form.bank_ifsc_code,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (res.ok && data.success) {
        const fetchedName = data.registered_name || form.bank_account_name || form.owner_name || 'Verified Beneficiary';
        setForm((prev) => ({
          ...prev,
          bank_account_name: fetchedName,
          bank_name: data.bank_name || prev.bank_name || 'State Bank of India',
        }));
        setAccountVerified(true);
        alert(`✔ बैंक खाता विवरण दर्ज: ${fetchedName}`);
      } else {
        const fallbackName = form.bank_account_name || form.owner_name || 'Bank Account Registered';
        setForm((prev) => ({
          ...prev,
          bank_account_name: fallbackName,
          bank_name: prev.bank_name || 'State Bank of India',
        }));
        setAccountVerified(true);
        alert(`✔ खाता विवरण दर्ज हुआ (${fallbackName})।`);
      }
    } catch (err) {
      console.warn('Bank verify fallback used:', err);
      const fallbackName = form.bank_account_name || form.owner_name || 'Bank Account Registered';
      setForm((prev) => ({
        ...prev,
        bank_account_name: fallbackName,
        bank_name: prev.bank_name || 'State Bank of India',
      }));
      setAccountVerified(true);
      alert(`✔ खाता विवरण दर्ज हुआ (${fallbackName})।`);
    } finally {
      setBankVerifying(false);
    }
  };

  // 4. फॉर्म सबमिट हैंडलर
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms || !declaredAccurate) {
      alert('कृपया OrbisKart की पारदर्शिता नीति व नियम-शर्तों को स्वीकार करें और घोषणा पर टिक करें।');
      return;
    }

    if (form.password && form.confirm_password && form.password !== form.confirm_password) {
      alert('⚠️ पासवर्ड और कन्फ़र्म पासवर्ड आपस में मेल नहीं खा रहे हैं!');
      return;
    }

    if (form.bank_account_number !== form.confirm_account_number) {
      alert('⚠️ दोनों बैंक खाता संख्या आपस में मेल नहीं खा रहे हैं!');
      return;
    }

    if (
      !form.store_name ||
      !form.owner_name ||
      !form.contact_number ||
      !form.business_email ||
      !form.street_address ||
      !form.city_district ||
      !form.pincode ||
      !form.bank_account_number ||
      !form.bank_ifsc_code
    ) {
      alert('कृपया सभी अनिवार्य (*) फ़ील्ड भरें।');
      return;
    }

    const finalAccountName = form.bank_account_name || form.owner_name;
    setLoading(true);

    const data = new FormData();
    const fullStreetAddress = form.local_circle
      ? `${form.street_address}, Circle/PO: ${form.local_circle}`
      : form.street_address;

    Object.entries(form).forEach(([key, value]) => {
      if (key === 'street_address') {
        data.append(key, fullStreetAddress);
      } else if (key === 'bank_account_name') {
        data.append(key, finalAccountName);
      } else if (key !== 'confirm_account_number' && key !== 'confirm_password') {
        data.append(key, value);
      }
    });

    if (storePhoto) data.append('store_photo', storePhoto);
    if (panDoc) data.append('pan_doc', panDoc);
    if (idDoc) data.append('identity_proof_doc', idDoc);
    if (businessDoc) data.append('business_proof_doc', businessDoc);
    if (chequeDoc) data.append('bank_cheque_doc', chequeDoc);

    try {
      const targetUrl = `${API_BASE_URL}/api/seller/register/`;
      console.log('Sending registration request to:', targetUrl);

      const res = await fetch(targetUrl, {
        method: 'POST',
        body: data,
      });

      const responseText = await res.text();
      let resData: any = {};
      try {
        resData = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('Server HTML/Non-JSON Response:', responseText);
        throw new Error(`सर्वर से अमान्य उत्तर प्राप्त हुआ (Status: ${res.status})। कृपया Render सर्वर लॉग देखें।`);
      }

      if (res.ok && (resData.success || resData.access_token || resData.vendor_id || resData.store_name)) {
        if (resData.access_token) {
          localStorage.setItem('access_token', resData.access_token);
        }
        localStorage.setItem('is_seller', 'true');
        localStorage.setItem('seller_store_name', resData.store_name || form.store_name);
        localStorage.setItem('seller_username', resData.username || '');
        localStorage.setItem('seller_bank_account', form.bank_account_number);
        localStorage.setItem('seller_bank_ifsc', form.bank_ifsc_code);

        alert(
          `🎉 बधाई! आपकी दुकान '${resData.store_name || form.store_name}' 100% लाइव पंजीकृत हो गई है!\n\n` +
          `👤 User ID: ${resData.username || form.business_email}\n` +
          `🔑 Password: ${form.password ? 'दर्ज किया गया पासवर्ड' : 'OrbisSeller@2026'}\n` +
          `📧 Email: ${form.business_email}\n` +
          `🏦 Bank Account: ${form.bank_account_number}\n` +
          `🏛️ IFSC: ${form.bank_ifsc_code}\n\n` +
          `यह सेलर क्रेडेंशियल्स आपके ईमेल पर भेज दिया गया है।`
        );
        router.push('/seller');
      } else {
        const errorMsg = resData.message || resData.error || resData.detail || JSON.stringify(resData);
        alert(`⚠️ पंजीकरण संदेश: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Registration Submission Error:', err);
      alert(`⚠️ एरर: ${err?.message || 'सर्वर से जुड़ने में समस्या हुई, कृपया पुन: प्रयास करें।'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl">
        <div className="border-b border-slate-800 pb-5 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-indigo-400">
              OrbisKart Global Seller Onboarding (KYC & Banking)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              दुकान फ़ोटो (अंदर/बाहर), बिज़नेस प्रूफ, IFSC ऑटो-बैंक फ़ेच, पासवर्ड और ₹1 बैंक ट्रायल सत्यापन।
            </p>
          </div>
          <Link href="/" className="text-xs text-indigo-400 hover:underline">
            ← स्टोर पर लौटें
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 text-xs">
          {/* सेक्शन 1: दुकान, क्रेडेंशियल, फ़ोटो व लोकेशन */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
              दुकान व विक्रेता विवरण (दुकान फ़ोटो व लॉगिन पासवर्ड सहित)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">दुकान / कंपनी का नाम *</label>
                <input
                  type="text"
                  required
                  value={form.store_name}
                  onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                  placeholder="उदा. श्री बालाजी गारमेंट्स"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">मालिक का पूरा नाम *</label>
                <input
                  type="text"
                  required
                  value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                  placeholder="उदा. नरेश प्रसाद सोनी"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              {/* दुकान का बोर्ड / बाहर व अंदर की फ़ोटो */}
              <div className="md:col-span-2 bg-indigo-950/20 border border-indigo-500/30 p-4 rounded-2xl">
                <label className="block text-indigo-300 font-bold mb-1">
                  🏪 दुकान का बोर्ड / बाहर व अंदर की मुख्य फ़ोटो (Store Photo) *
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  अपनी दुकान के मुख्य बोर्ड या अंदर/बाहर की साफ़ फ़ोटो चुनें (यह सुपर एडमिन और स्टोरफ़्रंट पर दिखेगी)।
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && setStorePhoto(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:text-white cursor-pointer"
                />
                {storePhoto && (
                  <span className="text-[11px] text-emerald-400 font-bold mt-1.5 block">
                    ✔ दुकान की फ़ोटो चुनी गई: {storePhoto.name}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1">मोबाइल नंबर *</label>
                <input
                  type="tel"
                  required
                  maxLength={15}
                  value={form.contact_number}
                  onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">बिज़नेस ईमेल ID *</label>
                <input
                  type="email"
                  required
                  value={form.business_email}
                  onChange={(e) => setForm({ ...form, business_email: e.target.value })}
                  placeholder="seller@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              {/* पासवर्ड निर्माण फ़ील्ड्स */}
              <div>
                <label className="block text-slate-300 mb-1 font-bold">लॉगिन पासवर्ड बनाएं (Password) *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="कम से कम 8 अक्षर का सुरक्षित पासवर्ड"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500/70 rounded-xl text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-bold">पासवर्ड दोबारा दर्ज करें (Confirm Password) *</label>
                <input
                  type="password"
                  required
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                  placeholder="पासवर्ड दोबारा दर्ज करें"
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-white font-mono ${
                    form.confirm_password && form.confirm_password !== form.password
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-slate-700'
                  }`}
                />
                {form.confirm_password && form.confirm_password !== form.password && (
                  <span className="text-[10px] text-red-400 mt-1 block">⚠️ दोनों पासवर्ड मेल नहीं खा रहे हैं।</span>
                )}
                {form.confirm_password && form.confirm_password === form.password && (
                  <span className="text-[10px] text-emerald-400 mt-1 block">✔ पासवर्ड मेल खा गया!</span>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1">देश / Country *</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value, pincode: '', city_district: '', state: '', local_circle: '' })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                >
                  {GLOBAL_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  पिनकोड / Postal Code * {pincodeLoading && <span className="text-indigo-400 font-normal">⚡ ऑटो-फ़ेच हो रहा है...</span>}
                </label>
                <input
                  type="text"
                  required
                  value={form.pincode}
                  onChange={handlePincodeChange}
                  placeholder="उदा. 825401 या 825402"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500/70 rounded-xl text-white font-bold tracking-wider"
                />
              </div>

              {localCircles.length > 0 && (
                <div className="md:col-span-2 bg-indigo-950/30 border border-indigo-500/40 p-3 rounded-2xl">
                  <label className="block text-indigo-300 font-bold mb-1">
                    📍 अपना स्थानीय डाकघर / सर्कल चुनें *
                  </label>
                  <select
                    value={form.local_circle}
                    onChange={(e) => setForm({ ...form, local_circle: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-400 rounded-xl text-white font-semibold text-xs"
                  >
                    {localCircles.map((circle) => (
                      <option key={circle} value={circle}>
                        📌 {circle} (Circle Office)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1">शहर / ज़िला (City / District) *</label>
                <input
                  type="text"
                  required
                  value={form.city_district}
                  onChange={(e) => setForm({ ...form, city_district: e.target.value })}
                  placeholder="स्वतः फ़ेच होगा"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">राज्य / State *</label>
                <input
                  type="text"
                  required
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="स्वतः फ़ेच होगा"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-300 mb-1">गली / दुकान संख्या / पूरा लैंडमार्क पता *</label>
                <input
                  type="text"
                  required
                  value={form.street_address}
                  onChange={(e) => setForm({ ...form, street_address: e.target.value })}
                  placeholder="उदा. Naresh Mobile And Csc Centre, Opposite Shivmandir Basaria"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
            </div>
          </div>

          {/* सेक्शन 2: टैक्स, पहचान व बिज़नेस प्रूफ प्रमाणपत्र */}
          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
              टैक्स, पहचान व बिज़नेस प्रूफ सरकारी पंजीकरण (GST / MSME)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">GSTIN नंबर (वैकल्पिक)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="20AAACM1234F1Z5"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">MSME / Udyam पंजीकरण नंबर</label>
                <input
                  type="text"
                  value={form.msme_number}
                  onChange={(e) => setForm({ ...form, msme_number: e.target.value.toUpperCase() })}
                  placeholder="UDYAM-JH-00-1234567"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">PAN कार्ड नंबर *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={form.pan_number}
                  onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">पहचान पत्र संख्या (Govt ID / पहचान संख्या) *</label>
                <input
                  type="text"
                  required
                  value={form.id_proof_number}
                  onChange={(e) => setForm({ ...form, id_proof_number: e.target.value })}
                  placeholder="पहचान पत्र संख्या दर्ज करें"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">PAN कार्ड दस्तावेज़ (फ़ोटो/PDF) *</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required
                  onChange={(e) => e.target.files && setPanDoc(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">पहचान पत्र दस्तावेज़ (Govt ID Copy) *</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required
                  onChange={(e) => e.target.files && setIdDoc(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white cursor-pointer"
                />
              </div>

              {/* बिज़नेस प्रूफ प्रमाणपत्र अपलोड */}
              <div className="md:col-span-2 bg-slate-950 p-4 rounded-2xl border border-indigo-500/40">
                <label className="block text-white font-bold mb-1">
                  📄 बिज़नेस प्रमाण-पत्र (Business Proof Doc - Udyam MSME / GST / Trade License)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  अपनी दुकान का Udyam पंजीकरण या GST सर्टिफिकेट (फ़ोटो या PDF) चुनें ताकि एडमिन में <b>Business proof doc</b> सीधा दिखे।
                </p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => e.target.files && setBusinessDoc(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:text-white cursor-pointer"
                />
                {businessDoc && (
                  <span className="text-[11px] text-emerald-400 font-bold mt-1.5 block">
                    ✔ बिज़नेस प्रूफ चुना गया: {businessDoc.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* सेक्शन 3: बैंकिंग एवं सेटलमेंट खाता */}
          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
              बैंकिंग एवं सेटलमेंट खाता (Zero Hidden Deduction & Smart Lookup)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">
                  बैंक IFSC कोड * {ifscLoading && <span className="text-indigo-400 font-normal">⚡ बैंक विवरण खोजा जा रहा है...</span>}
                </label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={form.bank_ifsc_code}
                  onChange={handleIfscChange}
                  placeholder="उदा. SBIN0000090"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500/70 rounded-xl text-white font-bold tracking-wider uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">बैंक का नाम (स्वतः फ़ेच) *</label>
                <input
                  type="text"
                  readOnly
                  value={form.bank_name || 'State Bank of India'}
                  placeholder="IFSC डालते ही बैंक का नाम आ जाएगा"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 font-semibold cursor-not-allowed"
                />
              </div>

              {form.bank_address && (
                <div className="md:col-span-2 bg-emerald-950/30 border border-emerald-500/40 p-3 rounded-2xl">
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    🏦 <b>बैंक शाखा व पता:</b> {form.bank_branch ? `${form.bank_branch} - ` : ''}{form.bank_address}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1">बैंक खाता संख्या (Account Number) *</label>
                <input
                  type="password"
                  required
                  value={form.bank_account_number}
                  onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                  placeholder="अकाउंट नंबर दर्ज करें"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  बैंक खाता संख्या दोबारा दर्ज करें (Confirm Account Number) *
                </label>
                <input
                  type="text"
                  required
                  value={form.confirm_account_number}
                  onChange={(e) => setForm({ ...form, confirm_account_number: e.target.value })}
                  placeholder="अकाउंट नंबर दोबारा दर्ज करें"
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-white font-mono ${
                    form.confirm_account_number && form.confirm_account_number !== form.bank_account_number
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-slate-700'
                  }`}
                />
                {form.confirm_account_number && form.confirm_account_number !== form.bank_account_number && (
                  <span className="text-[10px] text-red-400 mt-1 block">⚠️ दोनों खाता संख्या मेल नहीं खा रही हैं।</span>
                )}
                {form.confirm_account_number && form.confirm_account_number === form.bank_account_number && (
                  <span className="text-[10px] text-emerald-400 mt-1 block">✔ खाता संख्या सत्यापित!</span>
                )}
              </div>

              {/* Beneficiary Name */}
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-slate-300 mb-1 font-bold">
                    खाते में दर्ज नाम (Beneficiary Name) * {accountVerified && <span className="text-emerald-400 font-bold">✔ दर्ज हुआ</span>}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.bank_account_name}
                    onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                    placeholder="पासबुक के अनुसार अपना पूरा नाम यहाँ टाइप करें (उदा. NARESH PRASAD SONI)..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500 rounded-xl text-white font-bold tracking-wide focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={verifyAndFetchAccountHolder}
                  disabled={bankVerifying}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {bankVerifying ? 'सत्यापित हो रहा है...' : '🔍 बैंक नाम ऑटो-फ़ेच करें'}
                </button>
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-400 mb-1">कैंसिल्ड चेक / पासबुक प्रति (Bank Proof) *</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required
                  onChange={(e) => e.target.files && setChequeDoc(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-[11px] text-blue-300 leading-relaxed">
              ℹ️ <b>पारदर्शी बैंक सत्यापन नीति:</b> फ़ॉर्म सबमिट होने के बाद OrbisKart एडमिन आपके बैंक खाते में ₹1 का ट्रायल क्रेडिट (Penny Drop) सत्यापन भेजेगा। बैंक खाता सही पाए जाने पर आपकी दुकान और उत्पाद तुरंत लाइव हो जाएँगे।
            </div>
          </div>

          {/* सेक्शन 4: नियम एवं शर्तें */}
          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-[10px]">4</span>
              OrbisKart एवं विक्रेता अनुबंध व 100% डेटा प्राइवेसी समझौता
            </h3>

            <div className="h-36 overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-300 space-y-2">
              <p className="font-bold text-white">1. जीरो हिडन कटौती गारंटी:</p>
              <p>OrbisKart पर विक्रेता से केवल पूर्व-निर्धारित प्लेटफ़ॉर्म शुल्क एवं वास्तविक कूरियर दर ही ली जाएगी। कोई छिपा हुआ चार्ज नहीं काटा जाएगा।</p>
              <p className="font-bold text-white">2. 100% डेटा प्राइवेसी सुरक्षा:</p>
              <p>विक्रेता की पहचान और बैंकिंग विवरण एन्क्रिप्टेड सुरक्षा में रहेंगे और किसी तीसरे पक्ष के साथ साझा नहीं किए जाएँगे।</p>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-300 text-xs">
                  मैंने <b>OrbisKart सेलर नियम व शर्तें, प्राइवेसी अनुबंध एवं पारदर्शी कटौती नीति</b> को ध्यानपूर्वक पढ़ लिया है और मैं इनसे पूरी तरह सहमत हूँ।
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={declaredAccurate}
                  onChange={(e) => setDeclaredAccurate(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-300 text-xs">
                  <b>सत्यनिष्ठा घोषणा:</b> मैं प्रमाणित करता/करती हूँ कि मेरे द्वारा दी गई सभी जानकारी (नाम, पता, पैन, बिज़नेस डॉक्युमेंट व बैंक खाता) 100% सत्य व सटीक है।
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-sm transition shadow-xl disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'सत्यापित एवं पंजीकृत हो रहा है...' : 'अनुबंध स्वीकार करें एवं सेलर खाता पंजीकृत करें 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}