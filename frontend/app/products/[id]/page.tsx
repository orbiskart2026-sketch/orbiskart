'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';

interface Product {
  id: string | number;
  title: string;
  price: number;
  originalPrice: number;
  discount: number;
  description: string;
  images: string[];
  stock: number;
  seller: {
    name: string;
    rating: number;
    isVerified: boolean;
  };
  features: string[];
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  verifiedBuyer: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const [product] = useState<Product>({
    id: id,
    title: 'Orbis Premium Wireless Noise-Cancelling Headphones (Pro Edition)',
    price: 2499,
    originalPrice: 4999,
    discount: 50,
    description: 'क्रिस्टल क्लियर साउंड और डीप बास के साथ प्रीमियम हेडफ़ोन। 40 घंटे की लंबी बैटरी लाइफ, टाइप-सी फ़ास्ट चार्जिंग और ऑटोमैटिक नॉइज़ कैंसिलेशन से लैस। 1 साल की ब्रांड वारंटी के साथ उपलब्ध।',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80',
    ],
    stock: 12,
    seller: {
      name: 'Orbis Kart Mart',
      rating: 4.8,
      isVerified: true,
    },
    features: [
      '40 घंटे का बैकअप और फ़ास्ट चार्जिंग',
      'एक्टिव नॉइज़ कैंसिलेशन (ANC)',
      '1 वर्ष की पैन इंडिया वारंटी',
      '7 दिन की आसान रिटर्न एवं रिप्लेसमेंट पॉलिसी',
    ],
  });

  const [selectedImage, setSelectedImage] = useState(product.images[0]);
  const [pincode, setPincode] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');

  const [reviews, setReviews] = useState<Review[]>([
    {
      id: '1',
      userName: 'राजेश वर्मा',
      rating: 5,
      date: '2 दिन पहले',
      comment: 'साउंड क्वालिटी बहुत ही ज़बरदस्त है। 2 दिन के अंदर सुरक्षित डिलीवरी मिली!',
      verifiedBuyer: true,
    },
    {
      id: '2',
      userName: 'अमित कुमार',
      rating: 4,
      date: '1 हफ़्ते पहले',
      comment: 'बैटरी बैकअप काफ़ी अच्छा है। इस कीमत में सबसे बेहतरीन हेडफ़ोन।',
      verifiedBuyer: true,
    },
  ]);

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newUserName, setNewUserName] = useState('');

  const checkDelivery = () => {
    if (pincode.length === 6) {
      setDeliveryStatus('✓ आपके पिनकोड पर डिलीवरी उपलब्ध है (3 से 5 दिनों में एक्सप्रेस डिलीवरी)');
    } else {
      setDeliveryStatus('कृपया 6 अंकों का सही पिनकोड दर्ज करें।');
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment || !newUserName) return;

    const newRev: Review = {
      id: Date.now().toString(),
      userName: newUserName,
      rating: newRating,
      date: 'अभी-अभी',
      comment: newComment,
      verifiedBuyer: true,
    };

    setReviews([newRev, ...reviews]);
    setNewComment('');
    setNewUserName('');
    alert('आपकी समीक्षा सफलतापूर्वक दर्ज कर ली गई है!');
  };

  // Razorpay पेमेंट गेटवे ट्रिगर
  const handlePayment = () => {
    if (!window.Razorpay) {
      alert('Razorpay SDK लोड हो रहा है, कृपया 2 सेकंड बाद पुनः प्रयास करें।');
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder', // आपकी Razorpay Key
      amount: product.price * 100, // राशि पैसे में (₹2499 * 100)
      currency: 'INR',
      name: 'OrbisKart',
      description: product.title,
      image: 'https://placehold.co/128x128?text=OrbisKart',
      handler: function (response: any) {
        alert(`भुगतान सफल! Payment ID: ${response.razorpay_payment_id}`);
      },
      prefill: {
        name: 'ग्राहक नाम',
        email: 'customer@example.com',
        contact: '9876543210',
      },
      theme: {
        color: '#4f46e5',
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Razorpay Checkout Script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* नेविगेशन ब्रेडक्रंब */}
      <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-slate-400 flex items-center gap-2 border-b border-slate-800">
        <Link href="/" className="hover:text-indigo-400">होम</Link>
        <span>/</span>
        <Link href="/" className="hover:text-indigo-400">इलेक्ट्रॉनिक्स</Link>
        <span>/</span>
        <span className="text-slate-200 truncate">{product.title}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* इमेज गैलरी */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-center overflow-hidden">
            <img
              src={selectedImage}
              alt={product.title}
              className="w-full h-96 object-contain rounded-xl hover:scale-105 transition duration-300"
            />
          </div>
          <div className="flex gap-3 justify-center">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition ${
                  selectedImage === img ? 'border-indigo-500 scale-105' : 'border-slate-800 opacity-70'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* प्रोडक्ट विवरण */}
        <div className="md:col-span-7 space-y-6">
          <div>
            <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 px-3 py-1 rounded-full text-xs font-semibold">
              Orbis Verified Choice
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-3 leading-snug">
              {product.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                ★ 4.8
              </span>
              <span className="text-slate-400 text-xs">({reviews.length} कस्टमर रिव्यूज़)</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 text-xs font-medium">स्टॉक में उपलब्ध ({product.stock} बाकी)</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-baseline gap-4">
            <span className="text-3xl font-extrabold text-white">₹{product.price}</span>
            <span className="text-slate-400 line-through text-lg">₹{product.originalPrice}</span>
            <span className="text-emerald-400 font-bold text-sm bg-emerald-950/60 px-2 py-1 rounded">
              {product.discount}% छूट
            </span>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">{product.description}</p>

          <div className="space-y-2 border-t border-b border-slate-800 py-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">मुख्य विशेषताएं</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              {product.features.map((feat, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> {feat}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">डिलीवरी उपलब्धता जाँचें</label>
            <div className="flex gap-2 max-w-sm">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="6 अंकों का पिनकोड..."
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={checkDelivery}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                जाँचें
              </button>
            </div>
            {deliveryStatus && (
              <p className={`text-xs ${deliveryStatus.includes('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                {deliveryStatus}
              </p>
            )}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400">विक्रेता: </span>
              <span className="font-bold text-white">{product.seller.name}</span>
            </div>
            <span className="text-indigo-400 border border-indigo-800 bg-indigo-950 px-2 py-0.5 rounded text-[11px]">
              सत्यापित सेलर
            </span>
          </div>

          {/* एक्शन बटन्स */}
          <div className="flex gap-4 pt-2">
            <button className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold rounded-xl text-sm transition">
              कार्ट में जोड़ें
            </button>
            <button
              onClick={handlePayment}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30"
            >
              अभी खरीदें (Buy Now)
            </button>
          </div>
        </div>
      </div>

      {/* रिव्यू एवं रेटिंग */}
      <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-slate-800">
        <h2 className="text-xl font-bold text-white mb-6">ग्राहक समीक्षाएं एवं रेटिंग्स</h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-4">अपनी समीक्षा दर्ज करें</h3>
            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">आपका नाम</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="उदा. राहुल शर्मा"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">रेटिंग (स्टार्स)</label>
                <select
                  value={newRating}
                  onChange={(e) => setNewRating(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={5}>★★★★★ (5 - उत्कृष्ट)</option>
                  <option value={4}>★★★★☆ (4 - बहुत अच्छा)</option>
                  <option value={3}>★★★☆☆ (3 - सामान्य)</option>
                  <option value={2}>★★☆☆☆ (2 - ख़राब)</option>
                  <option value={1}>★☆☆☆☆ (1 - बहुत ख़राब)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">आपकी विस्तृत समीक्षा</label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="क्वालिटी और डिलीवरी के बारे में लिखें..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition"
              >
                समीक्षा सबमिट करें
              </button>
            </form>
          </div>

          <div className="md:col-span-7 space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{rev.userName}</span>
                    {rev.verifiedBuyer && (
                      <span className="text-emerald-400 text-[10px] bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 rounded">
                        ✓ Verified Buyer
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-[11px]">{rev.date}</span>
                </div>
                <div className="text-amber-400 text-xs tracking-wider">
                  {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{rev.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}