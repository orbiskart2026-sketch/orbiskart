'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: number;
  product: {
    id: number;
    title: string;
    price: string;
    image: string | null;
  };
  quantity: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';
const RAZORPAY_KEY_ID = 'rzp_live_TYKZhqiKUBOWGD';

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Address
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postOffice, setPostOffice] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');

  const loadCartData = async () => {
    setLoading(true);
    let loadedItems: CartItem[] = [];

    // 1. सबसे पहले लोकल बैकअप से लोड करें ताकि कभी खाली न दिखे
    try {
      const localCart = localStorage.getItem('user_cart_items');
      if (localCart) {
        loadedItems = JSON.parse(localCart);
      }
    } catch (e) {
      console.error(e);
    }

    // 2. बैकएंड API से सिंक करने का प्रयास करें
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cart/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const apiItems = Array.isArray(data) ? data : data.items || [];
          if (apiItems.length > 0) {
            loadedItems = apiItems;
            localStorage.setItem('user_cart_items', JSON.stringify(apiItems));
          }
        }
      } catch (err) {
        console.error('API Sync Error:', err);
      }
    }

    setItems(loadedItems);
    setLoading(false);
  };

  useEffect(() => {
    loadCartData();

    const savedAddr = localStorage.getItem('user_shipping_address');
    if (savedAddr) {
      try {
        const addr = JSON.parse(savedAddr);
        setFullName(addr.fullName || '');
        setPhone(addr.phone || '');
        setStreetAddress(addr.streetAddress || '');
        setPostOffice(addr.postOffice || '');
        setCity(addr.city || '');
        setDistrict(addr.district || '');
        setStateName(addr.stateName || '');
        setPincode(addr.pincode || '');
      } catch {}
    } else {
      setFullName(localStorage.getItem('username') || '');
      setPhone(localStorage.getItem('mobile') || '');
    }
  }, []);

  const updateQuantity = (productId: number, delta: number) => {
    const updated = items
      .map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    setItems(updated);
    localStorage.setItem('user_cart_items', JSON.stringify(updated));
  };

  const removeItem = (productId: number) => {
    const updated = items.filter((item) => item.product.id !== productId);
    setItems(updated);
    localStorage.setItem('user_cart_items', JSON.stringify(updated));
  };

  const totalAmount = items.reduce(
    (acc, item) => acc + parseFloat(item.product?.price || '0') * item.quantity,
    0
  );

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !streetAddress || !district || !stateName || !pincode) {
      alert('कृपया डिलीवरी का पूरा पता भरें।');
      return;
    }

    const fullAddress = `${fullName}, Mob: ${phone}, ${streetAddress}, PO: ${postOffice || 'N/A'}, City: ${city || district}, Dist: ${district}, State: ${stateName} - ${pincode}`;
    localStorage.setItem(
      'user_shipping_address',
      JSON.stringify({ fullName, phone, streetAddress, postOffice, city, district, stateName, pincode })
    );

    setSubmitting(true);

    const finishOrder = (method: string, refId: string) => {
      const localOrders = JSON.parse(localStorage.getItem('user_local_orders') || '[]');
      const newOrder = {
        id: Date.now(),
        created_at: new Date().toISOString(),
        total_price: totalAmount.toFixed(2),
        status: method === 'COD' ? 'Confirmed (COD)' : 'Paid (Online)',
        shipping_address: fullAddress,
        payment_method: method,
        payment_id: refId,
        items: items.map((i) => ({
          id: i.id,
          product_title: i.product?.title,
          price: i.product?.price,
          quantity: i.quantity,
        })),
      };
      localStorage.setItem('user_local_orders', JSON.stringify([newOrder, ...localOrders]));
      localStorage.removeItem('user_cart_items');
      setItems([]);
      alert('ऑर्डर सफलतापूर्वक दर्ज हो गया! 🎉');
      router.push('/orders');
    };

    if (paymentMethod === 'COD') {
      finishOrder('Cash on Delivery', 'COD_' + Date.now());
      return;
    }

    // Razorpay Online
    if (typeof window === 'undefined' || !(window as any).Razorpay) {
      alert('Razorpay लोड हो रहा है, कृपया 2 सेकंड बाद पुनः प्रयास करें।');
      setSubmitting(false);
      return;
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      name: 'OrbisKart',
      description: `Payment by ${fullName}`,
      handler: function (response: any) {
        finishOrder('Razorpay Online', response.razorpay_payment_id);
      },
      prefill: {
        name: fullName,
        contact: phone,
        email: localStorage.getItem('email') || `${phone}@orbiskart.com`,
      },
      theme: { color: '#2563eb' },
      modal: {
        ondismiss: function () {
          setSubmitting(false);
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-gray-900 pb-20">
      <header className="bg-white border-b sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black text-blue-600">
            OrbisKart
          </Link>
          <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
            ← Continue Shopping
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6">
        <h1 className="text-xl font-black mb-6">Shopping Cart & Secure Checkout</h1>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold">कार्ट लोड हो रहा है...</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border shadow-xs max-w-md mx-auto">
            <span className="text-5xl block mb-3">🛒</span>
            <h2 className="text-lg font-bold text-gray-800">आपका कार्ट खाली है!</h2>
            <Link
              href="/"
              className="mt-4 inline-block bg-blue-600 text-white font-bold text-xs px-6 py-2.5 rounded-lg hover:bg-blue-700"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Address */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
                  <span>📍</span> 1. Delivery Address (डिलीवरी का पूरा पता)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Mobile Number *</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Street / House / Landmark *</label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Post Office</label>
                    <input
                      type="text"
                      value={postOffice}
                      onChange={(e) => setPostOffice(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">City / Town</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">District *</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">State *</label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Pincode *</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2">
                  <span>💳</span> 2. Payment Method
                </h2>
                <div className="space-y-3">
                  <label className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${paymentMethod === 'ONLINE' ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="pay"
                        checked={paymentMethod === 'ONLINE'}
                        onChange={() => setPaymentMethod('ONLINE')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Online Payment (UPI, Google Pay, PhonePe, Cards, NetBanking)
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">⚡ Powered by Razorpay</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-600">Razorpay</span>
                  </label>

                  <label className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${paymentMethod === 'COD' ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="pay"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Cash on Delivery (COD)</span>
                        <span className="text-[10px] text-gray-500">Pay cash upon delivery</span>
                      </div>
                    </div>
                    <span className="text-base">💵</span>
                  </label>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-4">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>🛍️</span> 3. Cart Items ({items.length})
                </h2>
                {items.map((item) => (
                  <div key={item.product.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 last:border-b-0 last:pb-0 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border flex-shrink-0">
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.title} className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-[10px] text-gray-400">No Img</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-800">{item.product.title}</h3>
                        <span className="text-xs font-black text-gray-900 block mt-1">₹{item.product.price}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 border rounded-lg p-1 bg-gray-50">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 rounded bg-white border font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center text-sm">-</button>
                        <span className="text-xs font-black px-2.5">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 rounded bg-white border font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center text-sm">+</button>
                      </div>
                      <button onClick={() => removeItem(item.product.id)} className="text-xs text-red-600 hover:text-red-800 font-bold border border-red-200 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100">🗑️ Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Details */}
            <div className="lg:col-span-1">
              <div className="bg-white p-5 rounded-2xl border shadow-xs sticky top-24">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-4">Price Details</h2>
                <div className="space-y-3 text-xs border-b pb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Items Total</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className="text-emerald-600 font-bold">FREE</span>
                  </div>
                </div>
                <div className="flex justify-between font-black text-sm pt-4 mb-5">
                  <span>Total Amount</span>
                  <span className="text-blue-600">₹{totalAmount.toFixed(2)}</span>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-xs cursor-pointer uppercase tracking-wider"
                >
                  {submitting ? 'Processing...' : paymentMethod === 'ONLINE' ? `Pay ₹${totalAmount.toFixed(2)} via Razorpay ⚡` : 'Place Order ⚡ (COD)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}