import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    const keyId = 'rzp_live_TYKZhqjKUBOWGD';
    const keySecret = '57FOsB6kvoUCYz0I9f8EJZJO';

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: Math.round(Number(amount) * 100), // पैसे में
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Razorpay Error Response:', data);
      return NextResponse.json(
        { error: data.error?.description || 'Gateway Authentication Failed' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}