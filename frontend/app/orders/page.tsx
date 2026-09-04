'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OrderItem {
  id: number;
  product_title?: string;
  product?: {
    title: string;
    image: string | null;
  };
  price: string;
  quantity: number;
}

interface Order {
  id: number;
  created_at: string;
  total_price: string;
  status: string;
  shipping_address: string;
  items: OrderItem[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-gray-900 pb-20">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black text-blue-600">
            MegaStore
          </Link>
          <div className="flex items-center space-x-4 text-sm font-semibold">
            <Link href="/" className="text-gray-700 hover:text-blue-600">
              Shop Home
            </Link>
            <Link href="/cart" className="text-gray-700 hover:text-blue-600">
              Cart
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">My Orders & Invoices</h1>
          <p className="text-xs text-gray-500 mt-1">Track orders and download official GST tax invoices</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold">लोड हो रहा है...</div>
        ) : orders.length === 0 ? (
          <div className="bg-white border rounded-2xl p-16 text-center shadow-xs">
            <span className="text-4xl block mb-3">📦</span>
            <p className="text-gray-700 font-bold text-lg">आपने अभी तक कोई ऑर्डर नहीं दिया है।</p>
            <Link
              href="/"
              className="mt-4 inline-block bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs hover:bg-blue-700 transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between border-b pb-3 mb-3 gap-2">
                  <div>
                    <span className="text-xs font-bold text-gray-500">Order ID: #{order.id}</span>
                    <span className="text-xs text-gray-400 ml-3">
                      {new Date(order.created_at).toLocaleDateString('hi-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      {order.status || 'Confirmed'}
                    </span>
                    <span className="text-xs font-black text-gray-900 ml-2">Total: ₹{order.total_price}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-600 mb-3 bg-gray-50 p-2.5 rounded-lg">
                  <span className="font-bold text-gray-700">Delivery Address:</span> {order.shipping_address}
                </div>

                <div className="divide-y">
                  {order.items?.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-800">
                        {item.product_title || item.product?.title || 'Product'} × {item.quantity}
                      </span>
                      <span className="font-bold text-gray-900">₹{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}