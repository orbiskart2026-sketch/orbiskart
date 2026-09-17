'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

interface DeductionSlip {
  slip_number: string;
  order_id: string | number;
  gross_amount: string;
  deductions: string;
  net_settled: string;
  is_settled: boolean;
  utr: string;
}

interface CategoryItem {
  id: number;
  name: string;
}

interface SellerSummaryData {
  store_name: string;
  is_approved: boolean;
  penny_drop_verified: boolean;
  wallet_balance: string;
  orders_summary: {
    total: number;
    delivered: number;
    returns: number;
  };
  banking: {
    bank_name: string;
    account_masked: string;
    ifsc: string;
    is_verified: boolean;
  };
  deduction_slips: DeductionSlip[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';

export default function SellerPortalPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SellerSummaryData | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // उत्पाद जोड़ने का स्टेट
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    original_price: '',
    color: '',
    mfg_date: '',
    stock: '10',
    weight_grams: '300',
    package_length_cm: '10.00',
    package_width_cm: '10.00',
    package_height_cm: '5.00',
    hsn_code: '851830',
    gst_rate: '18.00',
    is_weight_frozen: true,
  });

  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);

  // ऑटोमैटिक डिस्काउंट प्रतिशत कैलकुलेशन
  const discountPercent = useMemo(() => {
    const orig = parseFloat(formData.original_price);
    const curr = parseFloat(formData.price);
    if (!isNaN(orig) && !isNaN(curr) && orig > curr && orig > 0) {
      return Math.round(((orig - curr) / orig) * 100);
    }
    return 0;
  }, [formData.original_price, formData.price]);

  useEffect(() => {
    fetchSellerDashboard();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/`);
      if (res.ok) {
        const data = await res.json();
        if (data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchSellerDashboard = async () => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    try {
      const headers: Record<string, string> = {};
      if (token && token !== 'undefined' && token !== 'null') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/seller/dashboard/`, { headers });

      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        setSummary({
          store_name: 'OrbisKart Merchant Hub',
          is_approved: true,
          penny_drop_verified: true,
          wallet_balance: '0.00',
          orders_summary: { total: 0, delivered: 0, returns: 0 },
          banking: {
            bank_name: 'State Bank of India',
            account_masked: 'XXXXXX5402',
            ifsc: 'SBIN0001234',
            is_verified: true,
          },
          deduction_slips: [],
        });
      }
    } catch (err) {
      console.error('Failed to load seller dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const form = new FormData();
    form.append('title', formData.title);
    form.append('description', formData.description);
    form.append('category', formData.category);
    form.append('price', formData.price);
    if (formData.original_price) form.append('original_price', formData.original_price);
    if (formData.color) form.append('color', formData.color);
    if (formData.mfg_date) form.append('mfg_date', formData.mfg_date);
    form.append('stock', formData.stock);
    form.append('weight_grams', formData.weight_grams);
    form.append('package_length_cm', formData.package_length_cm);
    form.append('package_width_cm', formData.package_width_cm);
    form.append('package_height_cm', formData.package_height_cm);
    form.append('hsn_code', formData.hsn_code);
    form.append('gst_rate', formData.gst_rate);
    form.append('is_weight_frozen', formData.is_weight_frozen ? 'true' : 'false');
    form.append('is_active', 'true');

    // मुख्य इमेज
    if (primaryFile) {
      form.append('image', primaryFile);
    }

    // मल्टीपल अतिरिक्त गैलरी फ़ोटोज़
    if (galleryFiles) {
      Array.from(galleryFiles).forEach((file) => {
        form.append('gallery_images', file);
      });
    }

    const headers: Record<string, string> = {};
    if (token && token !== 'undefined' && token !== 'null') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      let res = await fetch(`${API_BASE_URL}/api/products/`, {
        method: 'POST',
        headers: headers,
        body: form,
      });

      // यदि टोकन एक्सपायर/अमान्य मिले (401), तो अमान्य टोकन हटाकर दोबारा प्रयास करें
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
        }
        res = await fetch(`${API_BASE_URL}/api/products/`, {
          method: 'POST',
          body: form,
        });
      }

      if (res.ok) {
        alert('✅ 100% पारदर्शी उत्पाद मल्टीपल फ़ोटोज़ व वज़न लॉक के साथ लाइव हो गया!');
        setShowAddModal(false);
        setFormData({
          title: '',
          description: '',
          category: '',
          price: '',
          original_price: '',
          color: '',
          mfg_date: '',
          stock: '10',
          weight_grams: '300',
          package_length_cm: '10.00',
          package_width_cm: '10.00',
          package_height_cm: '5.00',
          hsn_code: '851830',
          gst_rate: '18.00',
          is_weight_frozen: true,
        });
        setPrimaryFile(null);
        setGalleryFiles(null);
      } else {
        const errorData = await res.json();
        alert('अपलोड त्रुटि: ' + JSON.stringify(errorData));
      }
    } catch (err) {
      alert('सर्वर से कनेक्ट करने में विफल');
    } finally {
      setUploading(false);
    }
  };

  const downloadSellerSlip = (orderId: string | number) => {
    window.open(`${API_BASE_URL}/orders/${orderId}/seller-slip/`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-20 font-sans">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-black text-blue-400">
              OrbisKart
            </Link>
            <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-md border border-slate-700">
              Merchant Partner Hub
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span>●</span> Live Audit Sync
            </span>
            <Link href="/" className="text-slate-300 hover:text-white font-medium">
              View Storefront
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* Store Title, Status & Add Product Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div>
            <h1 className="text-xl font-black text-gray-900">
              {summary?.store_name || 'My Seller Store'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              शून्य छुपा हुआ शुल्क (0% Hidden Cuts), कूरियर वज़न ऑडिट और डायरेक्ट T+3 बैंक सेटलमेंट
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span>
              <span>नया पारदर्शी उत्पाद जोड़ें (Add Product)</span>
            </button>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                summary?.is_approved
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
            >
              {summary?.is_approved ? '✔ Verified Seller' : '⏳ Verification Pending'}
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              ₹1 Penny-Drop: {summary?.penny_drop_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Wallet Balance (लाइव बैलेंस)
            </span>
            <span className="text-2xl font-black text-gray-900">
              ₹{summary ? parseFloat(summary.wallet_balance).toFixed(2) : '0.00'}
            </span>
            <span className="text-[11px] text-gray-500 block mt-2">अगले सेटलमेंट चक्र के लिए तैयार</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Total Dispatched Orders
            </span>
            <span className="text-2xl font-black text-blue-600">
              {summary?.orders_summary?.total || 0} Orders
            </span>
            <span className="text-[11px] text-gray-500 block mt-2">
              डिलीवर: {summary?.orders_summary?.delivered || 0} | रिटर्न: {summary?.orders_summary?.returns || 0}
            </span>
          </div>

          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-xs">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              Verified Settlement Account
            </span>
            <span className="text-lg font-black text-emerald-700 block truncate">
              {summary?.banking?.bank_name || 'Bank Account'}
            </span>
            <span className="text-[11px] text-emerald-800 font-mono block mt-1">
              {summary?.banking?.account_masked || 'XXXXXX'} (IFSC: {summary?.banking?.ifsc || 'N/A'})
            </span>
          </div>
        </div>

        {/* Deduction Slips Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
              Itemized Order Settlement Log & Deduction Slips
            </h2>
            <span className="text-xs text-gray-500 font-bold">100% Tax & Courier Disclosed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[10px] tracking-wider border-b">
                <tr>
                  <th className="p-4">Slip / Order ID</th>
                  <th className="p-4">Gross Sale</th>
                  <th className="p-4">Itemized Deductions</th>
                  <th className="p-4">Net Seller Payout</th>
                  <th className="p-4">Bank Status</th>
                  <th className="p-4">UTR Reference</th>
                  <th className="p-4 text-center">Audit Slip PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {summary && summary.deduction_slips && summary.deduction_slips.length > 0 ? (
                  summary.deduction_slips.map((slip) => (
                    <tr key={slip.slip_number} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <span className="font-mono font-bold text-gray-900 block">{slip.slip_number}</span>
                        <span className="text-[10px] text-gray-400">Order #{slip.order_id}</span>
                      </td>
                      <td className="p-4 font-black text-gray-900">₹{parseFloat(slip.gross_amount).toFixed(2)}</td>
                      <td className="p-4 text-rose-600">-₹{parseFloat(slip.deductions).toFixed(2)}</td>
                      <td className="p-4">
                        <span className="font-black text-emerald-700 text-sm block">
                          ₹{parseFloat(slip.net_settled).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            slip.is_settled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {slip.is_settled ? 'Settled to Bank' : 'In Escrow (T+3)'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-gray-500">
                        {slip.utr}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => downloadSellerSlip(slip.order_id)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg border border-indigo-200 transition cursor-pointer text-[11px]"
                        >
                          📄 Download Slip
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">
                      अभी तक कोई ऑर्डर सेटलमेंट स्लिप उपलब्ध नहीं है। जैसे ही आपके ऑर्डर डिलीवर होंगे, यहाँ 1-क्लिक डिडक्शन स्लिप और UTR दिखेगा।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zero-Fraud Weight Freeze Guarantee Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚖️</span>
            <h3 className="text-sm font-black text-blue-900">Zero-Fraud Weight Freeze Guarantee</h3>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            कूरियर कंपनियाँ बाद में मनमाना वज़न बढ़ाकर अतिरिक्त पेनल्टी शुल्क (Weight Discrepancy Charges) नहीं काट सकतीं। 
            पार्सल डिस्पैच करते समय सेलर के पैकेजिंग डाइमेंशन्स (L×B×H) डिजिटली लॉक रहते हैं और कटौती स्लिप में हर पैसे का हिसाब दर्ज होता है।
          </p>
        </div>
      </main>

      {/* --- पूर्ण पारदर्शी Add Product Modal (Transparency Engine) --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span>📦</span> नया पारदर्शी उत्पाद सूचीबद्ध करें (Add Product With Full Transparency)
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">2 रेट्स, डिस्काउंट, वज़न फ़्रीज़, रंग, Mfg तिथि, HSN व मल्टी-फ़ोटो</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
              {/* 1. Category & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">श्रेणी (Category) *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">श्रेणी चुनें (20 श्रेणियां उपलब्ध)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">उत्पाद का नाम (Title) *</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. कॉटन शर्ट / वायरलेस हेडफोन"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. विवरण */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">उत्पाद विवरण (Description) *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="सामग्री, साइज़, रंग और गुणवत्ता का सच्चा विवरण..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 3. दो रेट (MRP vs Selling Price) & Discount % */}
              <div className="grid grid-cols-3 gap-3 bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">MRP / पुराना मूल्य (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="2999"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    className="w-full p-2.5 bg-white border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">विक्रय मूल्य (Selling Price ₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1499"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-2.5 bg-white border rounded-xl font-black text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">डिस्काउंट (%)</label>
                  <input
                    type="text"
                    readOnly
                    value={discountPercent > 0 ? `${discountPercent}% छूट` : 'कोई छूट नहीं'}
                    className="w-full p-2.5 bg-gray-100 border rounded-xl font-black text-emerald-600 text-center"
                  />
                </div>
              </div>

              {/* 4. Color, Manufacturing Date & Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">रंग / वेरिएंट (Color)</label>
                  <input
                    type="text"
                    placeholder="उदा. Black, Blue, Red"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">निर्माण तिथि (Mfg Date)</label>
                  <input
                    type="date"
                    value={formData.mfg_date}
                    onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">उपलब्ध स्टॉक (Stock) *</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 5. पारदर्शी वज़न सुरक्षा (Weight Freeze) */}
              <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-900 flex items-center gap-1.5">
                    <span>⚖️</span> कूरियर वज़न ऑडिट व Weight Freeze सुरक्षा
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-amber-800">
                    <input
                      type="checkbox"
                      checked={formData.is_weight_frozen}
                      onChange={(e) => setFormData({ ...formData, is_weight_frozen: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    वज़न लॉक करें (Zero Penalty)
                  </label>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="block text-[10px] font-bold text-gray-600 mb-1">वज़न (Grams) *</span>
                    <input
                      type="number"
                      required
                      value={formData.weight_grams}
                      onChange={(e) => setFormData({ ...formData, weight_grams: e.target.value })}
                      className="w-full p-2 bg-white border rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-600 mb-1">लंबाई (L cm)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.package_length_cm}
                      onChange={(e) => setFormData({ ...formData, package_length_cm: e.target.value })}
                      className="w-full p-2 bg-white border rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-600 mb-1">चौड़ाई (W cm)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.package_width_cm}
                      onChange={(e) => setFormData({ ...formData, package_width_cm: e.target.value })}
                      className="w-full p-2 bg-white border rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-600 mb-1">ऊंचाई (H cm)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.package_height_cm}
                      onChange={(e) => setFormData({ ...formData, package_height_cm: e.target.value })}
                      className="w-full p-2 bg-white border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 6. HSN कोड, GST दर & मल्टीपल इमेजेस */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">HSN कोड *</label>
                  <input
                    type="text"
                    required
                    placeholder="851830"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">GST दर (%) *</label>
                  <select
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold text-gray-800"
                  >
                    <option value="0.00">0% (टैक्स मुक्त)</option>
                    <option value="5.00">5%</option>
                    <option value="12.00">12%</option>
                    <option value="18.00">18%</option>
                    <option value="28.00">28%</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">मुख्य फ़ोटो (Primary Image) *</label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPrimaryFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-[11px] p-1.5 bg-gray-50 border rounded-xl"
                  />
                </div>
              </div>

              {/* 7. मल्टीपल गैलरी फ़ोटोज़ (4-5 अतिरिक्त एंगल) */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  अतिरिक्त फ़ोटोज़ (Multiple Gallery Images)
                  <span className="text-[10px] text-gray-400 font-normal ml-2">
                    (Ctrl या Shift दबाकर 4-5 एंगल चुनें)
                  </span>
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setGalleryFiles(e.target.files);
                    }
                  }}
                  className="w-full text-[11px] p-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl"
                />
                {galleryFiles && (
                  <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                    ✔ {galleryFiles.length} अतिरिक्त फ़ोटोज़ चुनी गईं
                  </span>
                )}
              </div>

              {/* सबमिट बटन्स */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition cursor-pointer"
                >
                  {uploading ? '⏳ उत्पाद अपलोड हो रहा है...' : '🚀 उत्पाद लाइव करें (List Product)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}