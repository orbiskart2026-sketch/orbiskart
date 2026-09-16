'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SellerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    store_name: '',
    owner_name: '',
    contact_number: '',
    business_email: '',
    store_address: '',
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
  const [chequeDoc, setChequeDoc] = useState<File | null>(null);

  // टर्म्स और डिक्लेरेशन स्टेट
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [declaredAccurate, setDeclaredAccurate] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms || !declaredAccurate) {
      alert('कृपया OrbisKart की पारदर्शिता नीति व नियम-शर्तों को स्वीकार करें और घोषणा पर टिक करें।');
      return;
    }

    if (!form.store_name || !form.owner_name || !form.contact_number || !form.bank_account_number || !form.bank_ifsc_code) {
      alert('कृपया सभी अनिवार्य (*) फ़ील्ड भरें।');
      return;
    }

    setLoading(true);

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      data.append(key, value);
    });

    if (panDoc) data.append('pan_doc', panDoc);
    if (idDoc) data.append('identity_proof_doc', idDoc);
    if (chequeDoc) data.append('bank_cheque_doc', chequeDoc);

    try {
      const res = await fetch('https://orbiskart.onrender.com/api/seller/register/', {
        method: 'POST',
        body: data,
      });

      const resData = await res.json();
      if (res.ok && (resData.success || resData.id || resData.vendor_id)) {
        alert('🎉 बधाई! आपकी सेलर प्रोफ़ाइल पंजीकृत हो गई है। अब आप सीधे उत्पाद अपलोड और मैनेज कर सकते हैं।');
        router.push('/seller');
      } else {
        alert(`पंजीकरण विफल: ${resData.error || JSON.stringify(resData)}`);
      }
    } catch (err) {
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
              OrbisKart Seller Onboarding (KYC, Banking & Transparency)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Zero Hidden Charges, 100% पारदर्शी लेज़र और डायरेक्ट बैंक सेटलमेंट।
            </p>
          </div>
          <Link href="/" className="text-xs text-indigo-400 hover:underline">
            ← स्टोर पर लौटें
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 text-xs">
          {/* सेक्शन 1: दुकान व व्यक्तिगत विवरण */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
              दुकान व विक्रेता विवरण (Store & Owner Info)
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
                  maxLength={10}
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
              <div className="md:col-span-2">
                <label className="block text-slate-300 mb-1">दुकान / वेयरहाउस का पूरा पता *</label>
                <textarea
                  rows={2}
                  required
                  value={form.store_address}
                  onChange={(e) => setForm({ ...form, store_address: e.target.value })}
                  placeholder="दुकान संख्या, बाज़ार, गली, ज़िला, राज्य..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
            </div>
          </div>

          {/* सेक्शन 2: टैक्स व सरकारी अनुपालन (KYC) */}
          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
              टैक्स, पहचान व सरकारी पंजीकरण (GST / MSME / ID Proof)
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
                <label className="block text-slate-400 mb-1">PAN कार्ड दस्तावेज़ (फ़ोटो/PDF)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => e.target.files && setPanDoc(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">पहचान पत्र दस्तावेज़ (Govt ID Copy)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => e.target.files && setIdDoc(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white"
                />
              </div>
            </div>
          </div>

          {/* सेक्शन 3: बैंकिंग व ऑटोमैटिक पेआउट सेटलमेंट */}
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
                <label className="block text-slate-400 mb-1">कैंसिल्ड चेक / पासबुक की प्रति (Bank Proof)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => e.target.files && setChequeDoc(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white"
                />
              </div>
            </div>
          </div>

          {/* सेक्शन 4: टर्म्स, कंडीशंस एवं प्राइवेसी सुरक्षा अनुबंध */}
          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-[10px]">4</span>
              OrbisKart एवं विक्रेता अनुबंध व 100% डेटा प्राइवेसी समझौता
            </h3>

            {/* स्क्रॉल करने योग्य टर्म्स बॉक्स */}
            <div className="h-44 overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-300 space-y-2.5">
              <p className="font-bold text-white">1. जीरो हिडन कटौती गारंटी (Zero Hidden Cuts):</p>
              <p>OrbisKart पर विक्रेता के प्रत्येक ऑर्डर पर केवल पूर्व-निर्धारित प्लेटफ़ॉर्म शुल्क एवं वास्तविक कूरियर दर ही ली जाएगी। किसी भी प्रकार का गुप्त रिटर्न पेनल्टी या अघोषित विज्ञापन शुल्क नहीं काटा जाएगा।</p>

              <p className="font-bold text-white">2. 100% डेटा प्राइवेसी व सुरक्षा नीति:</p>
              <p>विक्रेता का आधार, पैन, बैंक खाता व संपर्क जानकारी एन्क्रिप्टेड सुरक्षा में रहेगी। इसे किसी भी तीसरे पक्ष या मार्केटिंग एजेंसी के साथ कभी साझा नहीं किया जाएगा।</p>

              <p className="font-bold text-white">3. स्वतंत्र प्रोफ़ाइल व बैंक बदलाव अधिकार (Self-Service Profile Edit):</p>
              <p>विक्रेता को अपने सेलर डैशबोर्ड से भविष्य में कभी भी अपनी दुकान का नाम, व्यापारिक पता या बैंक खाता विवरण OTP सुरक्षा सत्यापन के साथ बदलने का पूर्ण अधिकार रहेगा।</p>

              <p className="font-bold text-white">4. समयबद्ध स्वचालित बैंक भुगतान (T+2 / 7-Day Settlement):</p>
              <p>ऑर्डर डिलीवरी सत्यापित होने के बाद शुद्ध विक्रय राशि सीधे विक्रेता के पंजीकृत बैंक खाते में NEFT/RTGS के माध्यम से ट्रांसफ़र होगी, जिसकी कटौती स्लिप (Deduction Slip) पोर्टल पर उपलब्ध रहेगी।</p>

              <p className="font-bold text-white">5. वास्तविक व प्रामाणिक सामान विक्रय:</p>
              <p>विक्रेता यह सुनिश्चित करेगा कि उसके द्वारा लिस्ट किए गए उत्पाद 100% असली, वैध और सरकारी मानकों के अनुरूप हैं।</p>
            </div>

            {/* अनिवार्य चेकबॉक्स */}
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
                  <b>सत्यनिष्ठा घोषणा (Declaration):</b> मैं प्रमाणित करता/करती हूँ कि मेरे द्वारा दी गई सभी जानकारी (नाम, दुकान का पता, पैन व बैंक खाता) 100% सत्य व सटीक है।
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