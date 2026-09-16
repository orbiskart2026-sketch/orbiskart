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

export default function SellerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // लोकल सर्कल / पोस्ट ऑफिस की सूची
  const [localCircles, setLocalCircles] = useState<string[]>([]);

  const [form, setForm] = useState({
    store_name: '',
    owner_name: '',
    contact_number: '',
    business_email: '',
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
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
  });

  const [panDoc, setPanDoc] = useState<File | null>(null);
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [businessDoc, setBusinessDoc] = useState<File | null>(null);
  const [chequeDoc, setChequeDoc] = useState<File | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [declaredAccurate, setDeclaredAccurate] = useState(false);

  // पिनकोड डालते ही ज़िला, राज्य और सभी लोकल सर्कल/पोस्ट ऑफिस फ़ेच करना
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
          
          // सभी लोकल पोस्ट ऑफिस / सर्कल के नाम निकालना
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
        console.error(err);
      } finally {
        setPincodeLoading(false);
      }
    } else if (form.country !== 'IN' && code.length >= 3) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`https://api.zippopotam.us/${form.country.toLowerCase()}/${code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.places && data.places.length > 0) {
            const place = data.places[0];
            setForm((prev) => ({
              ...prev,
              city_district: place['place name'],
              state: place['state'],
              local_circle: place['place name'],
            }));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms || !declaredAccurate) {
      alert('कृपया OrbisKart की पारदर्शिता नीति व नियम-शर्तों को स्वीकार करें और घोषणा पर टिक करें।');
      return;
    }

    if (!form.store_name || !form.owner_name || !form.contact_number || !form.street_address || !form.city_district || !form.pincode || !form.bank_account_number || !form.bank_ifsc_code) {
      alert('कृपया सभी अनिवार्य (*) फ़ील्ड भरें।');
      return;
    }

    setLoading(true);

    const data = new FormData();
    // पूरे पते में लोकल सर्कल को जोड़ना
    const fullStreetAddress = form.local_circle 
      ? `${form.street_address}, Circle/PO: ${form.local_circle}`
      : form.street_address;

    Object.entries(form).forEach(([key, value]) => {
      if (key === 'street_address') {
        data.append(key, fullStreetAddress);
      } else {
        data.append(key, value);
      }
    });

    if (panDoc) data.append('pan_doc', panDoc);
    if (idDoc) data.append('identity_proof_doc', idDoc);
    if (businessDoc) data.append('business_proof_doc', businessDoc);
    if (chequeDoc) data.append('bank_cheque_doc', chequeDoc);

    try {
      const res = await fetch('https://orbiskart.onrender.com/api/seller/register/', {
        method: 'POST',
        body: data,
      });

      const resData = await res.json();
      if (res.ok && (resData.success || resData.id || resData.vendor_id)) {
        alert('🎉 बधाई! आपकी सेलर प्रोफ़ाइल पंजीकृत हो गई है। OrbisKart एडमिन द्वारा ₹1 बैंक ट्रायल सत्यापन पूरा होते ही आपकी दुकान लाइव हो जाएगी।');
        router.push('/seller');
      } else {
        alert(`पंजीकरण विफल: ${resData.error || JSON.stringify(resData)}`);
      }
    } catch {
      alert('सर्वर से जुड़ने में समस्या हुई। कृपया पुन: प्रयास करें।');
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
              Zero Hidden Charges, लोकल सर्कल/डाकघर ऑटो-फ़ेच, 100% पारदर्शी लेज़र और ₹1 बैंक सत्यापन।
            </p>
          </div>
          <Link href="/" className="text-xs text-indigo-400 hover:underline">
            ← स्टोर पर लौटें
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 text-xs">
          {/* सेक्शन 1: दुकान व लोकेशन */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
              दुकान व विक्रेता विवरण (Global Location & Circle Engine)
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
                  पिनकोड / Postal Code * {pincodeLoading && <span className="text-indigo-400 font-normal">⚡ लोकल सर्कल खोजा जा रहा है...</span>}
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

              {/* स्थानीय डाकघर / सर्कल चयन ड्रॉपडाउन */}
              {localCircles.length > 0 && (
                <div className="md:col-span-2 bg-indigo-950/30 border border-indigo-500/40 p-3 rounded-2xl">
                  <label className="block text-indigo-300 font-bold mb-1">
                    📍 अपना स्थानीय डाकघर / सर्कल चुनें (Select Local Area / Post Office Circle) *
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
                <label className="block text-slate-300 mb-1">गली / दुकान संख्या / वेयरहाउस पूरा लैंडमार्क पता *</label>
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

          {/* सेक्शन 2: टैक्स व सरकारी अनुपालन */}
          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
              टैक्स, पहचान व सरकारी पंजीकरण (GST / MSME / बिज़नेस प्रूफ)
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
                  placeholder="सरकारी पहचान संख्या दर्ज करें"
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
              <div className="md:col-span-2">
                <label className="block text-slate-400 mb-1">
                  दुकान / बिज़नेस प्रमाणपत्र (GST / Udyam MSME / Trade License / Gumasta Copy)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => e.target.files && setBusinessDoc(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* सेक्शन 3: बैंकिंग एवं ₹1 Penny Drop ट्रायल */}
          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
              बैंकिंग एवं सेटलमेंट खाता (Zero Hidden Deduction Bank Setup)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">बैंक का नाम *</label>
                <input
                  type="text"
                  required
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="उदा. State Bank of India"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">खाते में दर्ज नाम (Beneficiary) *</label>
                <input
                  type="text"
                  required
                  value={form.bank_account_name}
                  onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                  placeholder="उदा. Naresh Prasad Soni"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">बैंक खाता संख्या *</label>
                <input
                  type="password"
                  required
                  value={form.bank_account_number}
                  onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                  placeholder="अकाउंट नंबर दर्ज करें"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">बैंक IFSC कोड *</label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={form.bank_ifsc_code}
                  onChange={(e) => setForm({ ...form, bank_ifsc_code: e.target.value.toUpperCase() })}
                  placeholder="SBIN0001234"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white uppercase"
                />
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