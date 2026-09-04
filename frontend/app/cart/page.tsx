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

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Delivery Address Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postOffice, setPostOffice] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  const fetchCart = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems(data);
        } else if (data.items) {
          setItems(data.items);
        } else {
          setItems([]);
        }
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();

    // सेव किया हुआ एड्रेस ऑटो-लोड करें
    const savedAddress = localStorage.getItem('user_shipping_address');
    if (savedAddress) {
      try {
        const addr = JSON.parse(savedAddress);
        setFullName(addr.fullName || '');
        setPhone(addr.phone || '');
        setStreetAddress(addr.streetAddress || '');
        setPostOffice(addr.postOffice || '');
        setCity(addr.city || '');
        setDistrict(addr.district || '');
        setStateName(addr.stateName || '');
        setPincode(addr.pincode || '');
      } catch {
        // ignore
      }
    } else {
      const storedUser = localStorage.getItem('username');
      const storedMobile = localStorage.getItem('mobile') || localStorage.getItem('phone');
      if (storedUser) setFullName(storedUser);
      if (storedMobile) setPhone(storedMobile);
    }
  }, []);

  const changeQuantity = async (productId: number, delta: number, currentQty: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    if (currentQty <= 1 && delta === -1) {
      handleRemoveItem(productId);
      return;
    }

    setActionLoadingId(productId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/add/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId, quantity: delta }),
      });

      if (res.ok) {
        await fetchCart();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveItem = async (productId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setActionLoadingId(productId);
    try {
      let res = await fetch(`${API_BASE_URL}/api/cart/remove/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId }),
      });

      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/api/cart/delete/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ product_id: productId }),
        });
      }
      await fetchCart();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('कृपया पहले लॉगिन करें।');
      router.push('/login');
      return;
    }

    if (!fullName || !phone || !streetAddress || !district || !stateName || !pincode) {
      alert('कृपया नाम, मोबाइल, पता, ज़िला, राज्य और पिनकोड भरें।');
      return;
    }

    // एड्रेस लोकल स्टोरेज में हमेशा के लिए सेव करें
    const fullAddressObj = {
      fullName,
      phone,
      streetAddress,
      postOffice,
      city,
      district,
      stateName,
      pincode,
    };
    localStorage.setItem('user_shipping_address', JSON.stringify(fullAddressObj));

    const formattedShippingAddress = `${fullName}, Mob: ${phone}, ${streetAddress}, PO: ${postOffice || 'N/A'}, City: ${city || district}, Dist: ${district}, State: ${stateName} - ${pincode}`;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipping_address: formattedShippingAddress,
          payment_method: 'COD',
        }),
      });

      if (res.ok) {
        alert('ऑर्डर सफलतापूर्वक दर्ज किया गया! 🎉');
        router.push('/orders');
      } else {
        const errorData = await res.json().catch(() => null);
        alert(errorData?.error || 'ऑर्डर पूरा करने में समस्या आई। कृपया पुनः प्रयास करें।');
      }
    } catch (err) {
      console.error(err);
      alert('सर्वर से संपर्क नहीं हो सका।');
    } finally {
      setSubmitting(false);
    }
  };

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce(
    (acc, item) => acc + parseFloat(item.product?.price || '0') * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-gray-900 pb-20">
      <header className="bg-white border-b sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black text-blue-600">
            MegaStore
          </Link>
          <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
            ← Continue Shopping
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6">
        <h1 className="text-xl font-black mb-6">Shopping Cart & Delivery</h1>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold">कार्ट लोड हो रहा है...</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border shadow-xs max-w-md mx-auto">
            <span className="text-5xl block mb-3">🛒</span>
            <h2 className="text-lg font-bold text-gray-800">आपका कार्ट खाली है!</h2>
            <p className="text-xs text-gray-500 mt-1 mb-5">स्टोर से अपने पसंदीदा उत्पाद जोड़ें।</p>
            <Link
              href="/"
              className="bg-blue-600 text-white font-bold text-xs px-6 py-2.5 rounded-lg hover:bg-blue-700 transition"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Detailed Delivery Address Form */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <span>📍</span> Delivery Address (डिलीवरी का पूरा पता)
                  </h2>
                  <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Auto-Saved</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Full Name (पूरा नाम) *</label>
                    <input
                      type="text"
                      placeholder="Receiver's name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Mobile Number (मोबाइल नंबर) *</label>
                    <input
                      type="text"
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Flat / House No. / Village / Landmark (गली / मकान / गाँव / लैंडमार्क) *</label>
                    <input
                      type="text"
                      placeholder="e.g. Near Shiv Mandir, Main Road"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Post Office (डाकघर)</label>
                    <input
                      type="text"
                      placeholder="Post Office name"
                      value={postOffice}
                      onChange={(e) => setPostOffice(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">City / Town (शहर)</label>
                    <input
                      type="text"
                      placeholder="City or Town"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">District (ज़िला) *</label>
                    <input
                      type="text"
                      placeholder="District"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">State (राज्य) *</label>
                    <input
                      type="text"
                      placeholder="e.g. Jharkhand, Bihar, UP..."
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Pincode (पिन कोड) *</label>
                    <input
                      type="text"
                      placeholder="6-digit pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-4">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>🛍️</span> Cart Items ({items.length} Product{items.length > 1 ? 's' : ''})
                </h2>
                {items.map((item) => {
                  const img = item.product?.image
                    ? item.product.image.startsWith('http')
                      ? item.product.image
                      : `${API_BASE_URL}${item.product.image}`
                    : null;

                  const isBusy = actionLoadingId === item.product?.id;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 last:border-b-0 last:pb-0 gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border flex-shrink-0">
                          {img ? (
                            <img src={img} alt={item.product?.title || 'Product'} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-gray-400">No Img</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-gray-800 line-clamp-1">{item.product?.title}</h3>
                          <span className="text-xs font-black text-gray-900 block mt-1">₹{item.product?.price}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="flex items-center gap-1 border rounded-lg p-1 bg-gray-50">
                          <button
                            onClick={() => changeQuantity(item.product.id, -1, item.quantity)}
                            disabled={isBusy}
                            title="संख्या घटाएँ"
                            className="w-7 h-7 rounded bg-white border font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50 cursor-pointer flex items-center justify-center text-sm"
                          >
                            -
                          </button>
                          <span className="text-xs font-black px-2.5 min-w-[24px] text-center">
                            {isBusy ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => changeQuantity(item.product.id, 1, item.quantity)}
                            disabled={isBusy}
                            title="संख्या बढ़ाएँ"
                            className="w-7 h-7 rounded bg-white border font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50 cursor-pointer flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.product.id)}
                          disabled={isBusy}
                          className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition cursor-pointer"
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price Details */}
            <div className="lg:col-span-1">
              <div className="bg-white p-5 rounded-2xl border shadow-xs sticky top-24">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-4">Price Details</h2>
                <div className="space-y-3 text-xs border-b pb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Total Quantity</span>
                    <span>{totalItemsCount}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Price</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Charges</span>
                    <span className="text-emerald-600 font-bold">FREE</span>
                  </div>
                </div>

                <div className="flex justify-between font-black text-sm pt-4 mb-5">
                  <span>Total Amount</span>
                  <span className="text-blue-600">₹{subtotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-3 rounded-xl transition shadow-xs cursor-pointer disabled:bg-gray-300 uppercase tracking-wider"
                >
                  {submitting ? 'Placing Order...' : 'Place Order ⚡ (COD)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}