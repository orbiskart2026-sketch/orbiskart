'use client';

import { useEffect, useState } from 'react';

interface OrderItem {
  id: number;
  product_title: string;
  quantity: number;
  price: string;
}

interface Order {
  id: number;
  total_price: string;
  payment_method: string;
  status: string;
  delivery_otp: string;
  created_at: string;
  items: OrderItem[];
}

// लाइव या लोकल API यूआरएल का डायनामिक सेटअप
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${API_BASE_URL}/api/orders/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(Array.isArray(data) ? data : data.orders || []);
      }
    } catch (err) {
      console.error('ऑर्डर लोड करने में त्रुटि:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (orderId: number) => {
    // 1-Click आधिकारिक सरकारी GST इनवॉइस PDF डाउनलोड
    window.open(`${API_BASE_URL}/api/orders/${orderId}/invoice/`, '_blank');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#0f172a' }}>
        आपके ऑर्डर्स (OrbisKart Orders)
      </h1>

      {loading ? (
        <p>ऑर्डर विवरण लोड हो रहा है...</p>
      ) : orders.length === 0 ? (
        <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ color: '#64748b' }}>हाल ही में कोई ऑर्डर नहीं मिला या भुगतान प्रक्रियाधीन है।</p>
        </div>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '16px',
              backgroundColor: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>ऑर्डर संख्या: #{order.id}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>दिनांक: {new Date(order.created_at).toLocaleDateString('hi-IN')}</p>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', background: '#dcfce7', color: '#15803d' }}>
                {order.status}
              </span>
            </div>

            {/* आर्डर किए गए प्रोडक्ट्स की लिस्ट */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>उत्पाद विवरण:</p>
              {order.items && order.items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', padding: '4px 0', borderBottom: '1px dashed #f1f5f9' }}>
                  <span>{item.product_title} (x{item.quantity})</span>
                  <span>₹{item.price}</span>
                </div>
              ))}
            </div>

            <p style={{ margin: '6px 0' }}>कुल भुगतान: <strong>₹{order.total_price}</strong> ({order.payment_method})</p>
            <p style={{ margin: '6px 0', color: '#2563eb', fontWeight: '500' }}>सुरक्षित डिलीवरी OTP: <strong>{order.delivery_otp || 'XXXX'}</strong></p>

            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => downloadInvoice(order.id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '13px'
                }}
              >
                📄 GST Tax Invoice (PDF) डाउनलोड करें
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}