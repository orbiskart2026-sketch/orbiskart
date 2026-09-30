"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SellerRegistrationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Local development & Production API URL configuration
  const API_URL = "http://127.0.0.1:8000";

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirm_password: "",
    email: "",
    mobile_number: "",
    shop_name: "",
    owner_name: "",
    business_address: "",
    city_district: "",
    state: "Jharkhand",
    pincode: "",
    gstin_number: "",
    msme_udyam_number: "",
    pan_number: "",
    bank_account_number: "",
    confirm_account_number: "",
    ifsc_code: "",
    bank_holder_name: "",
    penny_drop_verified: false,
    mobile_otp: "",
    email_otp: "",
    captcha: "",
    terms_accepted: false,
    declared_accurate: false,
  });

  const [shopGpsPhoto, setShopGpsPhoto] = useState<File | null>(null);
  const [panDoc, setPanDoc] = useState<File | null>(null);
  const [identityProofDoc, setIdentityProofDoc] = useState<File | null>(null);
  const [businessDoc, setBusinessDoc] = useState<File | null>(null);

  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  
  // नई सुरक्षा स्टेट्स (Dynamic Captcha & Secure Verification Token)
  const [verificationToken, setVerificationToken] = useState("");
  const [captchaCode, setCaptchaCode] = useState("7842");

  useEffect(() => {
    // पेज लोड होते ही रैंडम 4-अंकीय Captcha कोड जनरेट करें
    const randomCaptcha = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(randomCaptcha);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSendOtp = async () => {
    let mobile = formData.mobile_number.trim();
    const email = formData.email.trim();

    if (!mobile && !email) {
      alert("कृपया मोबाइल नंबर या ईमेल दर्ज करें।");
      return;
    }

    if (mobile) {
      mobile = mobile.replace(/\D/g, "");
      if (mobile.length === 10) {
        mobile = "91" + mobile;
      }
      if (!/^91\d{10}$/.test(mobile)) {
        alert("कृपया सही 10-अंकों का भारतीय मोबाइल नंबर दर्ज करें।");
        return;
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/seller/send-otp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          mobile_number: mobile,
          email,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.detail || `OTP API error (${res.status})`);
      }

      setOtpSent(true);
      alert(data.message || "OTP भेज दिया गया है। कृपया मोबाइल/WhatsApp या ईमेल देखें।");
    } catch (err) {
      console.error("SEND OTP ERROR:", err);
      alert(`OTP भेजने में समस्या हुई।\n\nAPI: ${API_URL}\n\nDjango server की जाँच करें।`);
    }
  };

  const handleVerifyOtp = async (enteredOtp: string) => {
    const otp = enteredOtp.trim();

    if (!/^\d{6}$/.test(otp)) {
      alert("कृपया 6-अंकों का OTP दर्ज करें।");
      return;
    }

    let mobile = formData.mobile_number.trim().replace(/\D/g, "");
    if (mobile.length === 10) {
      mobile = "91" + mobile;
    }

    try {
      const res = await fetch(`${API_URL}/api/seller/verify-otp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          mobile_number: mobile,
          email: formData.email.trim(),
          otp,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.detail || "OTP verification failed");
      }

      // बैकएंड से मिला सिक्योर वेरिफिकेशन टोकन सेव करें
      if (data.verification_token) {
        setVerificationToken(data.verification_token);
      }

      setIsVerified(true);
      alert("✔ OTP सफलतापूर्वक सत्यापित हो गया।");
    } catch (err) {
      console.error("VERIFY OTP ERROR:", err);
      alert("OTP सत्यापन विफल हुआ। कृपया सही OTP दर्ज करें।");
    }
  };

  const handleVerifyBank = async () => {
    if (!formData.bank_account_number || !formData.ifsc_code) {
      alert("कृपया बैंक खाता संख्या और IFSC कोड दर्ज करें।");
      return;
    }

    if (formData.bank_account_number !== formData.confirm_account_number) {
      alert("दोनों बैंक खाता संख्या मेल नहीं खा रही हैं।");
      return;
    }

    setBankLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/seller/verify-bank/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_number: formData.bank_account_number,
          ifsc_code: formData.ifsc_code,
          owner_name: formData.owner_name,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.detail || "Bank verification failed");
      }

      const verifiedName = data.bank_holder_name || formData.owner_name || "Verified Beneficiary";

      setFormData((prev) => ({
        ...prev,
        bank_holder_name: verifiedName,
        penny_drop_verified: true,
      }));

      alert(`बैंक खाता सत्यापित: ${verifiedName}`);
    } catch (err) {
      console.error("BANK VERIFY ERROR:", err);
      alert("बैंक सत्यापन असफल हुआ। Backend/API की जाँच करें।");
    } finally {
      setBankLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVerified || !verificationToken) {
      alert("कृपया पहले मोबाइल/ईमेल का वास्तविक OTP सत्यापन पूरा करें।");
      setStep(1);
      return;
    }

    if (formData.captcha.trim() !== captchaCode) {
      alert(`कृपया सही Captcha कोड दर्ज करें। (कोड: ${captchaCode})`);
      return;
    }

    if (!formData.terms_accepted || !formData.declared_accurate) {
      alert("कृपया नियम एवं शर्तें तथा घोषणा स्वीकार करें।");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      alert("पासवर्ड मेल नहीं खा रहे हैं।");
      return;
    }

    setLoading(true);

    const postData = new FormData();

    Object.entries(formData).forEach(([key, val]) => {
      postData.append(key, String(val));
    });

    // सुरक्षा टोकन जोड़ें ताकि बैकएंड पहचान सके कि OTP वेरीफाइड है
    postData.append("verification_token", verificationToken);

    if (shopGpsPhoto) postData.append("shop_gps_photo", shopGpsPhoto);
    if (panDoc) postData.append("pan_doc", panDoc);
    if (identityProofDoc) postData.append("identity_proof", identityProofDoc);
    if (businessDoc) postData.append("business_document", businessDoc);

    try {
      const res = await fetch(`${API_URL}/api/seller/register-full/`, {
        method: "POST",
        body: postData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.detail || "Seller registration failed");
      }

      alert("🎉 आपका सेलर पंजीकरण सफलतापूर्वक दर्ज हो गया! एडमिन अनुमोदन के बाद दुकान लाइव होगी।");
      router.push("/seller/login");
    } catch (err: any) {
      console.error("SELLER REGISTRATION ERROR:", err);
      alert(`⚠️ Registration असफल रहा: ${err.message || 'Django backend जाँचें।'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl">
        <div className="border-b border-slate-800 pb-5 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-sky-400">
              OrbisKart Multi-Vendor Compliance & Onboarding
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              GST, MSME, GPS Photo, Bank Auto-Fetch, OTP & T&C Verified Portal.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/seller"
              className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs"
            >
              <span>👤</span>
              <span>Profile</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                window.location.href = "/seller/login";
              }}
              className="text-xs text-red-400 hover:underline font-bold"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-8 border-b border-slate-800 pb-4">
          <div className="flex justify-between overflow-x-auto gap-2">
            {[
              "1. ID & Password",
              "2. Shop & GPS",
              "3. Legal Docs",
              "4. Bank Penny-Drop",
              "5. Review & Submit",
            ].map((label, idx) => (
              <div
                key={idx}
                className={`text-center flex-1 min-w-[110px] ${
                  step === idx + 1 ? "text-sky-400 font-bold" : "text-slate-500"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs text-white ${
                    step === idx + 1 ? "bg-sky-600" : "bg-slate-800"
                  }`}
                >
                  {idx + 1}
                </div>
                <span className="text-[10px]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleFinalSubmit} className="space-y-6 text-xs">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                चरण 1: सेलर आईडी, पासवर्ड व OTP सत्यापन
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1">यूज़र आईडी *</label>
                  <input
                    type="text"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">बिजनेस ईमेल आईडी *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">लॉगिन पासवर्ड *</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">पासवर्ड कन्फ़र्म *</label>
                  <input
                    type="password"
                    name="confirm_password"
                    required
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 mb-1">
                    मोबाइल नंबर (WhatsApp / SMS) *
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="tel"
                      name="mobile_number"
                      required
                      maxLength={10}
                      value={formData.mobile_number}
                      onChange={handleInputChange}
                      placeholder="10 digit mobile"
                      className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                    />

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer"
                    >
                      वास्तविक OTP भेजें
                    </button>
                  </div>
                </div>
              </div>

              {otpSent && (
                <div className="p-3 bg-slate-950 rounded-xl border border-dashed border-sky-500/50 flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    name="mobile_otp"
                    value={formData.mobile_otp}
                    onChange={handleInputChange}
                    placeholder="6-अंक OTP"
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />

                  <button
                    type="button"
                    onClick={() => handleVerifyOtp(formData.mobile_otp)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold cursor-pointer"
                  >
                    सत्यापित करें
                  </button>

                  {isVerified && (
                    <span className="text-emerald-400 font-bold">✔ सत्यापित</span>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!isVerified) {
                      alert("पहले OTP सत्यापित करें।");
                      return;
                    }
                    setStep(2);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                >
                  अगला कदम: दुकान व GPS ➔
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                चरण 2: दुकान विवरण एवं GPS लोकेशन फोटो
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="shop_name"
                  required
                  placeholder="दुकान / ब्रांड का नाम"
                  value={formData.shop_name}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />

                <input
                  type="text"
                  name="owner_name"
                  required
                  placeholder="मालिक का पूरा नाम"
                  value={formData.owner_name}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />

                <textarea
                  name="business_address"
                  required
                  rows={2}
                  placeholder="व्यावसायिक पूरा पता"
                  value={formData.business_address}
                  onChange={handleInputChange}
                  className="md:col-span-2 w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />

                <input
                  type="text"
                  name="pincode"
                  required
                  maxLength={6}
                  placeholder="पिनकोड"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setShopGpsPhoto(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white cursor-pointer"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-3 bg-slate-700 text-white rounded-xl cursor-pointer"
                >
                  ⬅ पीछे जाएं
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl cursor-pointer"
                >
                  अगला कदम ➔
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                चरण 3: कर एवं कानूनी दस्तावेज
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="gstin_number"
                  value={formData.gstin_number}
                  onChange={handleInputChange}
                  placeholder="GSTIN नंबर"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />

                <input
                  type="text"
                  name="msme_udyam_number"
                  value={formData.msme_udyam_number}
                  onChange={handleInputChange}
                  placeholder="MSME / Udyam नंबर"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />

                <input
                  type="text"
                  name="pan_number"
                  required
                  maxLength={10}
                  value={formData.pan_number}
                  onChange={handleInputChange}
                  placeholder="PAN कार्ड नंबर"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />

                <input
                  type="file"
                  required
                  onChange={(e) => setPanDoc(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white cursor-pointer"
                />

                <input
                  type="file"
                  required
                  onChange={(e) => setIdentityProofDoc(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white cursor-pointer"
                />

                <input
                  type="file"
                  required
                  onChange={(e) => setBusinessDoc(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white cursor-pointer"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3 bg-slate-700 text-white rounded-xl cursor-pointer"
                >
                  ⬅ पीछे जाएं
                </button>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl cursor-pointer"
                >
                  अगला कदम ➔
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                चरण 4: बैंक खाता एवं पेनी-ड्रॉप सत्यापन
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="password"
                  name="bank_account_number"
                  required
                  value={formData.bank_account_number}
                  onChange={handleInputChange}
                  placeholder="बैंक खाता संख्या"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />

                <input
                  type="text"
                  name="confirm_account_number"
                  required
                  value={formData.confirm_account_number}
                  onChange={handleInputChange}
                  placeholder="खाता संख्या दोबारा"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />

                <input
                  type="text"
                  name="ifsc_code"
                  required
                  maxLength={11}
                  value={formData.ifsc_code}
                  onChange={handleInputChange}
                  placeholder="IFSC"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />

                <button
                  type="button"
                  onClick={handleVerifyBank}
                  disabled={bankLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                >
                  {bankLoading ? "सत्यापित हो रहा है..." : "⚡ बैंक खाता ऑटो-वेरिफाई करें"}
                </button>
              </div>

              {formData.bank_holder_name && (
                <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl">
                  <span className="text-emerald-300 font-bold">
                    ✔ बैंक खाता धारक: {formData.bank_holder_name}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-3 bg-slate-700 text-white rounded-xl cursor-pointer"
                >
                  ⬅ पीछे जाएं
                </button>

                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl cursor-pointer"
                >
                  अगला कदम ➔
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                चरण 5: समीक्षा और अंतिम स्वीकृति
              </h3>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                <div>
                  <strong>दुकान:</strong> {formData.shop_name || "N/A"}
                </div>
                <div>
                  <strong>मालिक:</strong> {formData.owner_name || "N/A"}
                </div>
                <div>
                  <strong>मोबाइल:</strong> {formData.mobile_number}
                </div>
                <div>
                  <strong>ईमेल:</strong> {formData.email}
                </div>
                <div>
                  <strong>बैंक खाताधारक:</strong>{" "}
                  {formData.bank_holder_name || "सत्यापन लंबित"}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="px-4 py-2 bg-slate-800 text-sky-400 font-mono font-bold text-lg tracking-widest rounded-lg">
                  {captchaCode}
                </div>

                <input
                  type="text"
                  name="captcha"
                  required
                  value={formData.captcha}
                  onChange={handleInputChange}
                  placeholder="ऊपर दिया गया Captcha दर्ज करें"
                  className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="terms_accepted"
                  required
                  checked={formData.terms_accepted}
                  onChange={handleInputChange}
                />
                <span>मैं OrbisKart की सभी नियम-शर्तें स्वीकार करता हूँ।</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="declared_accurate"
                  required
                  checked={formData.declared_accurate}
                  onChange={handleInputChange}
                />
                <span>मेरे द्वारा दी गई जानकारी और दस्तावेज सही हैं।</span>
              </label>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-5 py-3 bg-slate-700 text-white rounded-xl cursor-pointer"
                >
                  ⬅ पीछे जाएं
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                >
                  {loading
                    ? "पंजीकरण दर्ज हो रहा है..."
                    : "✔ अनुबंध स्वीकार करें एवं लाइव हों 🚀"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}