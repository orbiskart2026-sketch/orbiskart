'use client';

import { useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const amount = 1000; // कुल राशि (₹)

  const handlePayment = async () => {
    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. बैकएंड से Razorpay ऑर्डर प्राप्त करें
      const orderRes = await fetch('http://127.0.0.1:8000/api/payment/create-order/', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ amount }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || orderData.detail || 'ऑर्डर बनाने में विफल (कृपया लॉगिन करें या टोकन जांचें)');
      }

      // 2. Razorpay चेकआउट विंडो खोलें
      const options = {
        key: orderData.key_id,
        amount: orderData.amount * 100,
        currency: 'INR',
        name: 'OrbisKart',
        description: 'सुरक्षित और 100% पारदर्शी भुगतान',
        order_id: orderData.razorpay_order_id,
        handler: async function (response: any) {
          // 3. पेमेंट सिग्नेचर का बैकएंड पर सत्यापन
          const verifyRes = await fetch('http://127.0.0.1:8000/api/payment/verify/', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            alert('भुगतान सफल और सत्यापित!');
            window.location.href = '/orders';
          } else {
            alert('भुगतान सत्यापन विफल: ' + (verifyData.error || 'अमान्य हस्ताक्षर'));
          }
        },
        prefill: {
          name: 'Customer Name',
          email: 'buyer@orbiskart.com',
          contact: '9999999999',
        },
        theme: {
          color: '#0f172a',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      alert('त्रुटि: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>OrbisKart सुरक्षित चेकआउट</h2>
      <p style={{ fontSize: '16px', color: '#334155' }}>कुल देय राशि: <strong>₹{amount}.00</strong></p>
      <p style={{ color: '#16a34a', fontSize: '14px', marginTop: '4px', marginBottom: '20px' }}>✓ सरकारी HSN टैक्स व शून्य छिपे शुल्क के साथ</p>

      <button
        onClick={handlePayment}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '15px'
        }}
      >
        {loading ? 'प्रोसेसिंग...' : 'Razorpay से सुरक्षित भुगतान करें'}
      </button>
    </div>
  );
}