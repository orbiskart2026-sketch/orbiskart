import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json({ success: false, error: 'Phone number aur OTP zaroori hain.' }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
    const token = process.env.META_WHATSAPP_TOKEN;

    const bodyData = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: "seller_otp_template",
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp
              }
            ]
          }
        ]
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
    });

    const result = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data: result });
    } else {
      console.error('Meta API Error:', result);
      return NextResponse.json({ success: false, error: result }, { status: 500 });
    }

  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}