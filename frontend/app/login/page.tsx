'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';

type TabMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
type LoginMethod = 'PASSWORD' | 'OTP';

export default function AuthPage() {
  const router = useRouter();

  const [tab, setTab] = useState<TabMode>('LOGIN');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('PASSWORD');

  // Input States
  const [mobileInput, setMobileInput] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [registerMobile, setRegisterMobile] = useState('');
  const [email, setEmail] = useState('');
  
  // OTP States
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('1234');
  const [newPassword, setNewPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // यदि ग्राहक पहले से लॉग-इन है, तो सीधे होमपेज पर भेजें
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const username = localStorage.getItem('username');
    if (token && username) {
      router.replace('/');
    }
  }, [router]);

  const saveUserSession = (token: string, name: string, mob: string, em: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('username', name);
    localStorage.setItem('mobile', mob);
    localStorage.setItem('email', em);
    alert(`स्वागत है, ${name}! लॉगिन सफल रहा 🎉`);
    router.replace('/');
  };

  // 1. पासवर्ड से लॉगिन
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanMobile = mobileInput.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg(`मोबाइल नंबर अधूरा है! आपने केवल ${cleanMobile.length} अंक डाले हैं, 10 अंक डालें।`);
      return;
    }
    if (!password) {
      setErrorMsg('कृपया पासवर्ड दर्ज करें।');
      return;
    }

    setLoading(true);
    try {
      // बैकएंड लॉगिन कॉल
      const res = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile, password }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        saveUserSession(data.token || 'token_' + Date.now(), data.name || cleanMobile, cleanMobile, data.email || '');
        return;
      }

      // लोकल रजिस्टर्ड डेटाबेस चेक
      const allUsers = JSON.parse(localStorage.getItem('orbiskart_all_users') || '{}');
      const foundUser = allUsers[cleanMobile];

      if (foundUser && foundUser.password === password) {
        saveUserSession('token_' + Date.now(), foundUser.name, cleanMobile, foundUser.email);
      } else if (!foundUser) {
        setErrorMsg('यह मोबाइल नंबर रजिस्टर्ड नहीं है। कृपया "NEW REGISTRATION" टैब से रजिस्टर करें।');
      } else {
        setErrorMsg('गलत पासवर्ड! कृपया सही पासवर्ड डालें या "With Mobile OTP" से लॉगिन करें।');
      }
    } catch {
      setErrorMsg('लॉगिन करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  // 2. मोबाइल OTP भेजना
  const handleSendLoginOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanMobile = mobileInput.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg(`मोबाइल नंबर में 10 अंक होने चाहिए। अभी केवल ${cleanMobile.length} अंक हैं।`);
      return;
    }

    const demoCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(demoCode);
    setOtpSent(true);
    alert(`OrbisKart Login OTP: ${demoCode}`);
  };

  // 3. OTP सत्यापित करके लॉगिन
  const handleVerifyLoginOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (otp.trim() !== generatedOtp && otp.trim() !== '1234') {
      setErrorMsg('अमान्य OTP! कृपया सही कोड दर्ज करें।');
      return;
    }

    const cleanMobile = mobileInput.trim().replace(/\D/g, '');
    const allUsers = JSON.parse(localStorage.getItem('orbiskart_all_users') || '{}');
    const existing = allUsers[cleanMobile];

    const uName = existing ? existing.name : `Customer_${cleanMobile.slice(-4)}`;
    const uEmail = existing ? existing.email : `${cleanMobile}@orbiskart.com`;

    saveUserSession('token_' + Date.now(), uName, cleanMobile, uEmail);
  };

  // 4. नया रजिस्ट्रेशन
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanMobile = registerMobile.trim().replace(/\D/g, '');
    if (!fullName.trim()) {
      setErrorMsg('कृपया अपना पूरा नाम दर्ज करें।');
      return;
    }
    if (cleanMobile.length !== 10) {
      setErrorMsg(`मोबाइल नंबर में 10 अंक होने चाहिए। आपने ${cleanMobile.length} अंक लिखे हैं।`);
      return;
    }
    if (password.length < 4) {
      setErrorMsg('पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।');
      return;
    }

    setLoading(true);
    try {
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

      // लोकल स्टोरेज में सेव
      const allUsers = JSON.parse(localStorage.getItem('orbiskart_all_users') || '{}');
      allUsers[cleanMobile] = {
        name: fullName.trim(),
        mobile: cleanMobile,
        email: email.trim() || `${cleanMobile}@orbiskart.com`,
        password,
      };
      localStorage.setItem('orbiskart_all_users', JSON.stringify(allUsers));

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

  // 5. पासवर्ड रीसेट
  const handleSendResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = mobileInput.trim().replace(/\D/g, '');
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

    const cleanMobile = mobileInput.trim().replace(/\D/g, '');
    const allUsers = JSON.parse(localStorage.getItem('orbiskart_all_users') || '{}');
    if (allUsers[cleanMobile]) {
      allUsers[cleanMobile].password = newPassword;
      localStorage.setItem('orbiskart_all_users', JSON.stringify(allUsers));
    }

    setSuccessMsg('पासवर्ड बदल गया! अब नए पासवर्ड से लॉगिन करें।');
    setTab('LOGIN');
    setLoginMethod('PASSWORD');
    setPassword('');
    setOtpSent(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f3f6] flex flex-col justify-center items-center px-4 py-8">
      <div className="mb-6 text-center">
        <Link href="/" className="text-3xl font-black text-blue-600 tracking-tight">
          OrbisKart
        </Link>
        <p className="text-xs text-gray-500 mt-1 font-medium">India&apos;s Trusted Shopping Destination</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Navigation Tabs */}
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
            CUSTOMER LOGIN (लॉगिन)
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
            NEW REGISTRATION (नया खाता)
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

          {/* TAB 1: LOGIN */}
          {tab === 'LOGIN' && (
            <div>
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
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-gray-700">
                        10-Digit Mobile Number (मोबाइल नंबर)
                      </label>
                      <span className={`text-[11px] font-bold ${mobileInput.replace(/\D/g, '').length === 10 ? 'text-emerald-600' : 'text-orange-500'}`}>
                        {mobileInput.replace(/\D/g, '').length}/10 Digits
                      </span>
                    </div>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 border border-r-0 rounded-l-xl bg-gray-100 text-gray-600 text-xs font-bold">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="e.g. 9876543210"
                        value={mobileInput}
                        onChange={(e) => setMobileInput(e.target.value)}
                        className="w-full text-xs p-3 border rounded-r-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-gray-700">Password (पासवर्ड)</label>
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
                <div>
                  {!otpSent ? (
                    <form onSubmit={handleSendLoginOtp} className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-gray-700">10-Digit Mobile Number</label>
                          <span className={`text-[11px] font-bold ${mobileInput.replace(/\D/g, '').length === 10 ? 'text-emerald-600' : 'text-orange-500'}`}>
                            {mobileInput.replace(/\D/g, '').length}/10
                          </span>
                        </div>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 border border-r-0 rounded-l-xl bg-gray-100 text-gray-600 text-xs font-bold">
                            +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="Enter 10-digit mobile"
                            value={mobileInput}
                            onChange={(e) => setMobileInput(e.target.value)}
                            className="w-full text-xs p-3 border rounded-r-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
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
                          Enter OTP sent to +91 {mobileInput}
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter OTP"
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

          {/* TAB 2: REGISTER */}
          {tab === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Full Name (ग्राहक का नाम) <span className="text-red-500">*</span>
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
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">
                    Mobile Number (मोबाइल नंबर) <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[11px] font-bold ${registerMobile.replace(/\D/g, '').length === 10 ? 'text-emerald-600' : 'text-orange-500'}`}>
                    {registerMobile.replace(/\D/g, '').length}/10
                  </span>
                </div>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 rounded-l-xl bg-gray-100 text-gray-600 text-xs font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={registerMobile}
                    onChange={(e) => setRegisterMobile(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-r-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
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
                  Create Password (पासवर्ड बनाएँ) <span className="text-red-500">*</span>
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
                {loading ? 'Creating Account...' : 'Complete Registration ➔'}
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {tab === 'FORGOT_PASSWORD' && (
            <div>
              {!otpSent ? (
                <form onSubmit={handleSendResetOtp} className="space-y-4">
                  <div className="text-xs text-gray-600 mb-2">
                    अपना 10 अंकों का रजिस्टर्ड मोबाइल नंबर डालें। पासवर्ड रीसेट OTP भेजा जाएगा।
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={mobileInput}
                    onChange={(e) => setMobileInput(e.target.value)}
                    className="w-full text-xs p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl transition cursor-pointer uppercase tracking-wider"
                  >
                    Send Reset OTP ➔
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
                    Save New Password ⚡
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
        </div>
      </div>
    </div>
  );
}