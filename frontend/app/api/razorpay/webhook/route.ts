import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'orbiskart_secure_audit_secret_2026';

    // 1. सिग्नेचर वेरिफिकेशन
    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: 'Invalid Webhook Signature' }, { status: 400 });
      }
    }

    const eventData = JSON.parse(rawBody);

    // 2. पेमेंट कन्फर्म होते ही ऑटो-लेजर ट्रिगर
    if (eventData.event === 'payment.captured') {
      const payment = eventData.payload.payment.entity;
      const orderId = payment.order_id;
      const amount = payment.amount / 100;

      // पारदर्शी वित्तीय गणना
      const gatewayFee = parseFloat((amount * 0.02).toFixed(2));
      const platformFee = parseFloat((amount * 0.03).toFixed(2));
      const shippingFee = 65.00;
      const gstDeduction = parseFloat(((gatewayFee + platformFee) * 0.18).toFixed(2));
      const netSellerPayout = parseFloat((amount - gatewayFee - platformFee - shippingFee - gstDeduction).toFixed(2));

      const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const generatedAWB = `OBK-${Date.now().toString().slice(-8)}`;

      console.log('--- [ORBISKART AUTO-AUDIT ENGINE EVENT] ---');
      console.log(`Payment Captured: ₹${amount} | ID: ${payment.id}`);
      console.log(`Net Seller Share: ₹${netSellerPayout} | Taxes: ₹${gstDeduction}`);
      console.log(`Logistics AWB: ${generatedAWB} | Delivery OTP: ${deliveryOtp}`);
      console.log('-------------------------------------------');

      return NextResponse.json({
        status: 'Audit Ledger Reconciled',
        orderId,
        awb: generatedAWB,
        deliveryOtp,
      });
    }

    return NextResponse.json({ status: 'Ignored Non-Payment Event' });
  } catch (err: any) {
    console.error('Webhook Processing Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}