'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';

type TabMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
type LoginMethod = 'PASSWORD' | 'OTP';

export default function AuthPage() {
  const router = useRouter();

  // Tab & Method States
  const [tab, setTab] = useState<TabMode>('LOGIN');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('PASSWORD');

  // Input Fields
  const [identifier, setIdentifier] = useState(''); // Mobile or Username
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('1234');
  const [newPassword, setNewPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. यदि ग्राहक पहले से लॉग-इन है, तो उसे तुरंत होमपेज पर भेजें (रजिस्ट्रेशन नहीं खुलेगा)
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const username = localStorage.getItem('username');
    if (token && username) {
      router.replace('/');
    }
  }, [router]);

  // लॉगिन सेशन सेव करने का कॉमन फंक्शन
  const saveUserSession = (token: string, name: string, mob: string, em: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('username', name);
    localStorage.setItem('mobile', mob);
    localStorage.setItem('email', em);
    alert(`स्वागत है, ${name}! आपका लॉगिन सफल रहा 🎉`);
    router.replace('/');
  };

  // 2. लॉगिन हैंडलर (Password से)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setErrorMsg('कृपया मोबाइल नंबर/यूज़रनेम और पासवर्ड दोनों दर्ज करें।');
      return;
    }

    setLoading(true);
    try {
      // बैकएंड लॉगिन प्रयास
      const res = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        saveUserSession(
          data.token || 'token_' + Date.now(),
          data.name || cleanId,
          data.mobile || cleanId,
          data.email || ''
        );
        return;
      }

      // लोकल रजिस्टर्ड डेटाबेस में चेक करें
      const allUsers = JSON.parse(localStorage.getItem('orbiskart_all_users') || '{}');
      const foundUser = Object.values(allUsers).find(
        (u: any) =>
          (u.mobile === cleanId || u.name?.toLowerCase() === cleanId.toLowerCase() || u.email?.toLowerCase() === cleanId.toLowerCase()) &&
          u.password === password
      ) as any;

      if (foundUser) {
        saveUserSession('token_' + Date.now(), foundUser.name, foundUser.mobile, foundUser.email);
      } else {
        setErrorMsg('गलत मोबाइल नंबर, यूज़रनेम या पासवर्ड! कृपया पुनः प्रयास करें।');
      }
    } catch {
      setErrorMsg('लॉगिन करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  // 3. OTP लॉगिन हैंडलर (Send OTP)
  const handleSendLoginOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanMobile = identifier.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg('OTP प्राप्त करने हेतु कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    const demoCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(demoCode);
    setOtpSent(true);
    alert(`OrbisKart Login OTP: ${demoCode}`);
  };

  // 4. OTP लॉगिन कन्फर्मेशन
  const handleVerifyLoginOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (otp.trim() !== generatedOtp && otp.trim() !== '1234') {
      setErrorMsg('अमान्य OTP! कृपया सही 4 अंकों का कोड दर्ज करें।');
      return;
    }

    const cleanMobile = identifier.trim().replace(/\D/g, '');
    const allUsers = JSON.parse(localStorage.getItem('orbiskart_all_users') || '{}');
    const existing = allUsers[cleanMobile];

    const uName = existing ? existing.name : `User_${cleanMobile.slice(-4)}`;
    const uEmail = existing ? existing.email : `${cleanMobile}@orbiskart.com`;

    saveUserSession('token_' + Date.now(), uName, cleanMobile, uEmail);
  };

  // 5. नया रजिस्ट्रेशन हैंडलर (स्थायी डेटा सेव)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (!fullName.trim()) {
      setErrorMsg('कृपया अपना पूरा नाम दर्ज करें।');
      return;
    }
    if (cleanMobile.length !== 10) {
      setErrorMsg('कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।');
      return;
    }

    setLoading(true);
    try {
      // बैकएंड पर यूज़र सेव करें
      await fetch(`${API_BASE_URL}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          mobile: cleanMobile,
          email: email.trim() || `${cleanMobile}@orbiskart.com`,
          password,
        }),
      }).catch(() => null);

      // स्थायी ब्राउज़र स्टोरेज में सुरक्षित करें
      const allUsers = JSON.parse(localStorage.getItem('orbiskart_all_users') || '{}');
      allUsers[cleanMobile] = {
        name: fullName.trim(),
        mobile: cleanMobile,
        email: email.trim() || `${cleanMobile}@orbiskart.com`,
        password,
      };
      localStorage.setItem('orbiskart_all_users', JSON.stringify(allUsers));

      // सीधे ऑटो-लॉगिन करा दें ताकि दोबारा न खुलना पड़े
      saveUserSession(
        'token_' + Date.now(),
        fullName.trim(),
        cleanMobile,
        email.trim() || `${cleanMobile}@orbiskart.com`
      );
    } catch {
      setErrorMsg('रजिस्ट्रेशन पूरा नहीं हो सका।');
    } finally {
      setLoading(false);
    }
  };

  // 6. पासवर्ड भूलने पर (Forgot Password)
  const handleSendResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }
    const demoCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(demoCode);
    setOtpSent(true);
    alert(`Password Reset OTP: ${demoCode}`);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim() !== generatedOtp && otp.trim() !== '1234') {
      setErrorMsg('अमान्य OTP!');
      return;
    }
    if (newPassword.length < 4) {
      setErrorMsg('नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।');
      return;
    }

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    const allUsers = JSON.parse(localStorage.getItem('orbiskart_all_users') || '{}');
    if (allUsers[cleanMobile]) {
      allUsers[cleanMobile].password = newPassword;
      localStorage.setItem('orbiskart_all_users', JSON.stringify(allUsers));
    }

    setSuccessMsg('पासवर्ड सफलतापूर्वक बदल दिया गया! अब लॉगिन करें।');
    setTab('LOGIN');
    setLoginMethod('PASSWORD');
    setIdentifier(cleanMobile);
    setPassword('');
    setOtpSent(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f3f6] flex flex-col justify-center items-center px-4 py-8">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <Link href="/" className="text-3xl font-black text-blue-600 tracking-tight">
          OrbisKart
        </Link>
        <p className="text-xs text-gray-500 mt-1 font-medium">India&apos;s Trusted Shopping Destination</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Top Header Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => {
              setTab('LOGIN');
              setErrorMsg('');
            }}
            className={`flex-1 py-3.5 text-xs font-black transition cursor-pointer ${
              tab === 'LOGIN'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/30'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            CUSTOMER LOGIN
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('REGISTER');
              setErrorMsg('');
            }}
            className={`flex-1 py-3.5 text-xs font-black transition cursor-pointer ${
              tab === 'REGISTER'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/30'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            NEW REGISTRATION
          </button>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2 rounded-lg font-semibold">
              ✅ {successMsg}
            </div>
          )}

          {/* TAB 1: LOGIN (PASSWORD या OTP से) */}
          {tab === 'LOGIN' && (
            <div>
              {/* Login Method Toggle */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('PASSWORD');
                    setOtpSent(false);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    loginMethod === 'PASSWORD' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  🔑 With Password
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('OTP')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    loginMethod === 'OTP' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  📱 With Mobile OTP
                </button>
              </div>

              {loginMethod === 'PASSWORD' ? (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Mobile Number or Username
                    </label>
                    <input
                      type="text"
                      placeholder="10-digit mobile or name"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full text-xs p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-gray-700">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setTab('FORGOT_PASSWORD');
                          setOtpSent(false);
                          setErrorMsg('');
                        }}
                        className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-xs cursor-pointer uppercase tracking-wider"
                  >
                    {loading ? 'Logging In...' : 'Log In to OrbisKart ⚡'}
                  </button>
                </form>
              ) : (
                // OTP Login
                <div>
                  {!otpSent ? (
                    <form onSubmit={handleSendLoginOtp} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">
                          10-Digit Mobile Number
                        </label>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="e.g. 9876543210"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full text-xs p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-xs cursor-pointer uppercase tracking-wider"
                      >
                        Send Login OTP ➔
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1 text-center">
                          Enter OTP sent to +91 {identifier}
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 4-Digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full text-center tracking-widest text-lg font-black p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          autoFocus
                        />
                        <span className="text-[11px] text-gray-500 mt-1.5 block text-center">
                          डेमो कोड: <strong className="text-blue-600">{generatedOtp}</strong>
                        </span>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-xs cursor-pointer uppercase tracking-wider"
                      >
                        Verify OTP & Log In ⚡
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ONE-TIME REGISTRATION */}
          {tab === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Full Name (पूरा नाम) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Naresh Soni"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Mobile Number (मोबाइल नंबर) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Email ID (ऑटो इनवॉइस हेतु)
                </label>
                <input
                  type="email"
                  placeholder="e.g. name@gmail.com (Optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Set Login Password (पासवर्ड बनाएँ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="At least 4 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-xs cursor-pointer uppercase tracking-wider mt-1"
              >
                {loading ? 'Creating Account...' : 'Complete Registration & Start Shopping ➔'}
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {tab === 'FORGOT_PASSWORD' && (
            <div>
              {!otpSent ? (
                <form onSubmit={handleSendResetOtp} className="space-y-4">
                  <div className="text-xs text-gray-600 mb-2">
                    अपना 10 अंकों का रजिस्टर्ड मोबाइल नंबर दर्ज करें। हम सत्यापन हेतु एक OTP भेजेंगे।
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full text-xs p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl transition cursor-pointer uppercase tracking-wider"
                  >
                    Send OTP to Reset Password ➔
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Enter 4-Digit OTP
                    </label>
                    <input
                      type="text"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 text-center tracking-widest font-black"
                      required
                    />
                    <span className="text-[10px] text-gray-400 block mt-1 text-center">
                      डेमो OTP: {generatedOtp}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Set New Password (नया पासवर्ड)
                    </label>
                    <input
                      type="password"
                      placeholder="New password (min 4 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 rounded-xl transition cursor-pointer uppercase tracking-wider"
                  >
                    Update Password & Proceed ⚡
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setTab('LOGIN');
                  setOtpSent(false);
                }}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-800 block pt-3 cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t text-center text-[11px] text-gray-500">
            By continuing, you agree to OrbisKart&apos;s{' '}
            <span className="text-blue-600 underline">Terms of Use</span> and{' '}
            <span className="text-blue-600 underline">Privacy Policy</span>.
          </div>
        </div>
      </div>
    </div>
  );
}