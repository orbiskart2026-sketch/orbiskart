'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';

export default function NewProductUploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    original_price: '',
    weight_grams: '300',
    package_length_cm: '15.0',
    package_width_cm: '10.0',
    package_height_cm: '5.0',
  });

  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [packagePhoto, setPackagePhoto] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);

  // मल्टीपल गैलरी इमेजेज सेलेक्ट हैंडलर
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setGalleryImages(filesArray);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.price.trim() || !primaryImage || !packagePhoto) {
      alert('कृपया उत्पाद का नाम, विक्रय मूल्य, मुख्य फ़ोटो और Weight Freeze पार्सल फ़ोटो अवश्य भरें।');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('description', form.description.trim());
      formData.append('price', form.price.trim());
      formData.append('original_price', form.original_price.trim() || form.price.trim());
      formData.append('weight_grams', form.weight_grams || '500');
      formData.append('package_length_cm', form.package_length_cm || '10.0');
      formData.append('package_width_cm', form.package_width_cm || '10.0');
      formData.append('package_height_cm', form.package_height_cm || '5.0');

      // मुख्य थंबनेल फ़ोटो
      formData.append('image', primaryImage);

      // Weight Freeze पार्सल फ़ोटो
      formData.append('package_photo', packagePhoto);

      // मल्टीपल गैलरी फ़ोटो (लूप में अलग-अलग फाइल अपेंड करना)
      if (galleryImages.length > 0) {
        galleryImages.forEach((file) => {
          formData.append('gallery_images', file);
        });
      }

      if (video) {
        formData.append('video', video);
      }

      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/products/`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      const data = await res.json();

      if (res.ok && (data.success || data.product_id)) {
        alert(`🎉 सफलता! उत्पाद #${data.product_id || ''} (${galleryImages.length} गैलरी फ़ोटो सहित) लाइव पब्लिश हो गया और Django Admin में उपलब्ध है!`);
        router.push('/seller');
      } else {
        alert(`अपलोड विफल: ${data.error || JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('सर्वर से संपर्क नहीं हो सका। कृपया इंटरनेट कनेक्शन जाँचें।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 font-sans">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-indigo-400">नया उत्पाद जोड़ें (Multi-Image Engine)</h1>
            <p className="text-xs text-slate-400 mt-1">100% पारदर्शी लेज़र, मल्टीपल फ़ोटो और Weight Freeze डिजिटल लॉक</p>
          </div>
          <Link href="/seller" className="text-xs text-indigo-400 hover:underline">
            ← सेलर डैशबोर्ड पर लौटें
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* बुनियादी विवरण */}
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-1">उत्पाद का शीर्षक (Title) *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="उदा. बनारसी सिल्क साड़ी / वायरलेस ईयरबड्स"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">विवरण (Description)</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="उत्पाद की विशेषताएँ, मटीरियल, वारंटी विवरण आदि"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">सेलिंग प्राइस (Selling Price ₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="उदा. 1499.00"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">एमआरपी / मूल मूल्य (MRP ₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.original_price}
                  onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                  placeholder="उदा. 2999.00"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Weight Freeze Engine */}
          <div className="p-5 bg-indigo-950/30 border border-indigo-500/40 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-base">⚖️</span>
              <div>
                <h3 className="text-sm font-bold text-emerald-400">Weight Freeze Guarantee (वज़न व पैकेजिंग लॉक)</h3>
                <p className="text-[11px] text-slate-400">
                  पैकेजिंग का सही वज़न और साइज़ दर्ज करें। यह डेटा कूरियर पार्टनर के साथ लॉक रहेगा जिससे कोई अतिरिक्त पेनल्टी नहीं कटेगी।
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">वज़न (Grams) *</label>
                <input
                  type="number"
                  required
                  value={form.weight_grams}
                  onChange={(e) => setForm({ ...form, weight_grams: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">लंबाई (L cm) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={form.package_length_cm}
                  onChange={(e) => setForm({ ...form, package_length_cm: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">चौड़ाई (W cm) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={form.package_width_cm}
                  onChange={(e) => setForm({ ...form, package_width_cm: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">ऊँचाई (H cm) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={form.package_height_cm}
                  onChange={(e) => setForm({ ...form, package_height_cm: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">
                पैकिंग बॉक्स / पार्सल फ़ोटो (Weight Scale Proof) *
              </label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => e.target.files && setPackagePhoto(e.target.files[0])}
                className="w-full text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white cursor-pointer"
              />
            </div>
          </div>

          {/* मीडिया: मुख्य फोटो, मल्टीपल गैलरी फोटो और वीडियो */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1">मुख्य उत्पाद फ़ोटो (Primary Image) *</label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => e.target.files && setPrimaryImage(e.target.files[0])}
                className="w-full text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">
                अतिरिक्त फ़ोटो (Multiple Gallery Images - 1 से अधिक चुनें)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryChange}
                className="w-full text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white cursor-pointer"
              />
              {galleryImages.length > 0 && (
                <span className="text-emerald-400 font-bold block mt-1.5">
                  ✔ {galleryImages.length} गैलरी फ़ोटो चुनी गईं
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">उत्पाद वीडियो (वैकल्पिक)</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => e.target.files && setVideo(e.target.files[0])}
              className="w-full text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-sm transition shadow-xl disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'मल्टीपल फ़ोटो और उत्पाद अपलोड हो रहा है...' : 'सुरक्षित Weight Freeze के साथ उत्पाद लाइव करें 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}