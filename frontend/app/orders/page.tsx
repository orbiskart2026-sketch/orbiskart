'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OrderItem {
  id: number;
  product: {
    id: number;
    title: string;
    image: string | null;
  };
  price: string;
  quantity: number;
}

interface Order {
  id: number;
  base_price: string;
  tax_amount: string;
  delivery_fee: string;
  discount_amount: string;
  total_price: string;
  payment_method: string;
  shipping_address: string;
  status: string;
  created_at: string;
  items: OrderItem[];
}

const TRACKING_STEPS = [
  { key: 'Confirmed', label: 'Order Confirmed', icon: '📝' },
  { key: 'Packed', label: 'Packed', icon: '📦' },
  { key: 'Shipped', label: 'Shipped', icon: '🚚' },
  { key: 'Out for Delivery', label: 'Out for Delivery', icon: '🛵' },
  { key: 'Delivered', label: 'Delivered', icon: '🎉' },
];

function getStepIndex(status: string) {
  const map: Record<string, number> = {
    'Confirmed': 0,
    'Packed': 1,
    'Shipped': 2,
    'Out for Delivery': 3,
    'Delivered': 4,
  };
  return map[status] ?? 0;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('http://127.0.0.1:8000/api/orders/my-orders/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to fetch orders', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  const handleDownloadInvoice = async (orderId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setDownloadingId(orderId);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/orders/${orderId}/invoice/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        alert('Invoice download failed.');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MegaStore_Invoice_Order_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error downloading invoice.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black text-blue-600">
            MegaStore
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-sm font-semibold text-gray-700 hover:text-blue-600">
              Shop Home
            </Link>
            <Link href="/cart" className="text-sm font-semibold text-gray-700 hover:text-blue-600">
              Cart
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold">My Orders & Invoices</h1>
            <p className="text-sm text-gray-500 mt-1">Track orders and download official GST tax invoices</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium">Loading your orders...</div>
        ) : orders.length === 0 ? (
          <div className="bg-white border rounded-2xl p-12 text-center shadow-sm">
            <p className="text-gray-500 text-lg">आपने अभी तक कोई ऑर्डर नहीं दिया है।</p>
            <Link href="/" className="mt-4 inline-block bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-700 transition">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => {
              const currentStep = getStepIndex(order.status);
              const isCancelled = order.status === 'Cancelled';

              return (
                <div key={order.id} className="bg-white border rounded-2xl p-6 shadow-sm overflow-hidden">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between border-b pb-4 mb-6 gap-2">
                    <div>
                      <span className="text-xs uppercase font-bold text-gray-400 block">Order ID</span>
                      <span className="font-extrabold text-gray-900">#{order.id}</span>
                    </div>
                    <div>
                      <span className="text-xs uppercase font-bold text-gray-400 block">Date Placed</span>
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs uppercase font-bold text-gray-400 block">Payment Mode</span>
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {order.payment_method === 'COD' ? '💵 Cash on Delivery' : '⚡ UPI / Online'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-block px-3 py-1 text-xs font-extrabold rounded-full ${
                        isCancelled
                          ? 'bg-red-100 text-red-700'
                          : order.status === 'Delivered'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                      <button
                        onClick={() => handleDownloadInvoice(order.id)}
                        disabled={downloadingId === order.id}
                        className="text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 px-3.5 py-1.5 rounded-lg transition flex items-center space-x-1.5 shadow-sm disabled:bg-gray-400"
                      >
                        <span>📄</span>
                        <span>{downloadingId === order.id ? 'Generating...' : 'Invoice PDF'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Shipment Progress Bar */}
                  {isCancelled ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm font-bold text-red-600 mb-6">
                      ❌ This order has been cancelled.
                    </div>
                  ) : (
                    <div className="mb-8 px-2 py-4 bg-gray-50 border rounded-2xl">
                      <div className="relative flex items-center justify-between">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-full bg-gray-200 z-0">
                          <div
                            className="h-full bg-blue-600 transition-all duration-500 rounded-full"
                            style={{ width: `${(currentStep / (TRACKING_STEPS.length - 1)) * 100}%` }}
                          />
                        </div>

                        {TRACKING_STEPS.map((step, idx) => {
                          const isDone = idx <= currentStep;
                          const isCurrent = idx === currentStep;

                          return (
                            <div key={step.key} className="relative z-10 flex flex-col items-center text-center">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                                  isCurrent
                                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110 shadow-md'
                                    : isDone
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border-2 border-gray-300 text-gray-400'
                                }`}
                              >
                                {isDone && !isCurrent ? '✓' : step.icon}
                              </div>
                              <span
                                className={`text-[11px] mt-2 font-bold max-w-[70px] sm:max-w-none ${
                                  isCurrent
                                    ? 'text-blue-600'
                                    : isDone
                                    ? 'text-gray-900'
                                    : 'text-gray-400'
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Products List */}
                  <div className="space-y-3 mb-4">
                    {order.items.map((item) => {
                      const imageUrl = item.product.image
                        ? (item.product.image.startsWith('http') ? item.product.image : `http://127.0.0.1:8000${item.product.image}`)
                        : null;

                      return (
                        <div key={item.id} className="flex items-center space-x-4 bg-gray-50 p-3 rounded-xl">
                          <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                            {imageUrl ? (
                              <img src={imageUrl} alt={item.product.title} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-gray-400 font-bold">No Img</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 truncate">{item.product.title}</h4>
                            <p className="text-xs text-gray-500 font-medium">Qty: {item.quantity} × ₹{item.price}</p>
                          </div>
                          <div className="text-right font-extrabold text-sm text-gray-900">
                            ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Transparent Invoice Breakdown */}
                  <div className="bg-gray-50 rounded-xl p-3.5 mb-3 text-xs space-y-1.5 border">
                    <div className="flex justify-between text-gray-600">
                      <span>Base Value:</span>
                      <span>₹{order.base_price}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>GST (18% Included):</span>
                      <span>₹{order.tax_amount}</span>
                    </div>
                    {parseFloat(order.discount_amount) > 0 && (
                      <div className="flex justify-between text-green-600 font-bold">
                        <span>Total Savings:</span>
                        <span>-₹{order.discount_amount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Charges:</span>
                      <span className="text-green-600 font-bold">FREE</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-gray-900 border-t pt-1.5 mt-1">
                      <span>Total Paid:</span>
                      <span className="text-blue-600">₹{order.total_price}</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600">
                    <span className="font-bold text-gray-800">Delivery Address: </span>
                    {order.shipping_address || 'No address specified'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}