import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  return createClient(url, key);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_payment_id, productId, amount, customerEmail, customerContact } = body;

    if (!razorpay_payment_id) {
      return NextResponse.json({ error: 'अमान्य पेमेंट आईडी' }, { status: 400 });
    }

    const grossAmount = Number(amount) || 2499;

    // वित्तीय गणना (Transparency Engine)
    const gatewayFee = +(grossAmount * 0.02).toFixed(2);       // 2% Payment Gateway
    const platformFee = +(grossAmount * 0.03).toFixed(2);      // 3% Marketplace Fee
    const courierFee = 50.0;                                   // Standard Shipping
    const gstTax = +((gatewayFee + platformFee) * 0.18).toFixed(2); // 18% GST on services
    const netPayout = +(grossAmount - (gatewayFee + platformFee + courierFee + gstTax)).toFixed(2);

    const generatedOrderId = `ORD-${Date.now().toString().slice(-6)}`;
    const generatedAwb = `AWB-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Supabase में लेजर रिकॉर्ड इंसर्ट करें
    const supabase = getSupabase();
    const { data, error } = await supabase.from('audit_ledgers').insert([
      {
        order_id: generatedOrderId,
        customer_email: customerEmail || 'customer@orbiskart.com',
        customer_contact: customerContact || '+91 9876543210',
        gross_amount: grossAmount,
        gateway_fee: gatewayFee,
        platform_fee: platformFee,
        shipping_fee: courierFee,
        gst_tax: gstTax,
        net_seller_payout: netPayout,
        awb_number: generatedAwb,
        delivery_otp: generatedOtp,
        reconciliation_status: 'Settled',
      },
    ]);

    if (error) {
      console.error('Supabase Sync Error:', error);
    }

    return NextResponse.json({
      success: true,
      orderId: generatedOrderId,
      awb: generatedAwb,
      otp: generatedOtp,
      paymentId: razorpay_payment_id,
    });
  } catch (err: any) {
    console.error('Verify API Crash:', err);
    return NextResponse.json({ error: 'आंतरिक सर्वर त्रुटि' }, { status: 500 });
  }
}