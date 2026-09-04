'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';

type AuthView = 'ENTER_MOBILE' | 'LOGIN_PASSWORD' | 'LOGIN_OTP' | 'REGISTER' | 'FORGOT_PASSWORD' | 'SET_NEW_PASSWORD';

export default function AuthPage() {
  const router = useRouter();

  const [view, setView] = useState<AuthView>('ENTER_MOBILE');
  const [mobile, setMobile] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('1234');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. मोबाइल नंबर चेक करें कि पुराना ग्राहक है या नया
  const handleCheckMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    setLoading(true);
    try {
      // बैकएंड से चेक करें कि क्या यह नंबर पहले से मौजूद है
      const res = await fetch(`${API_BASE_URL}/api/auth/check-user/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile }),
      }).catch(() => null);

      let isExisting = false;
      let existingName = '';

      if (res && res.ok) {
        const data = await res.json();
        isExisting = data.exists;
        existingName = data.name || '';
      } else {
        // फॉलबैक: लोकल रजिस्टर्ड लिस्ट से चेक करें
        const registeredUsers = JSON.parse(localStorage.getItem('orbiskart_registered_users') || '{}');
        if (registeredUsers[cleanMobile]) {
          isExisting = true;
          existingName = registeredUsers[cleanMobile].name;
        }
      }

      if (isExisting) {
        setFullName(existingName || 'Customer');
        setView('LOGIN_PASSWORD'); // रजिस्टर्ड है तो सीधे पासवर्ड स्क्रीन पर भेजें
      } else {
        setView('REGISTER'); // नया है तो नाम, ईमेल व पासवर्ड सेट करने को कहें
      }
    } catch {
      setView('REGISTER');
    } finally {
      setLoading(false);
    }
  };

  // 2. पासवर्ड से लॉगिन
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!password) {
      setErrorMsg('कृपया पासवर्ड दर्ज करें।');
      return;
    }

    setLoading(true);
    const cleanMobile = mobile.trim().replace(/\D/g, '');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile, password }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        saveUserSession(data.token || 'orbiskart_token_' + Date.now(), data.name || fullName, cleanMobile, data.email || '');
      } else {
        // लोकल क्रेडेंशियल चेक
        const registeredUsers = JSON.parse(localStorage.getItem('orbiskart_registered_users') || '{}');
        const userRec = registeredUsers[cleanMobile];
        if (userRec && userRec.password === password) {
          saveUserSession('orbiskart_token_' + Date.now(), userRec.name, cleanMobile, userRec.email);
        } else {
          setErrorMsg('गलत पासवर्ड! कृपया सही पासवर्ड डालें या OTP से लॉगिन करें।');
        }
      }
    } catch {
      setErrorMsg('लॉगिन करने में समस्या आई।');
    } finally {
      setLoading(false);
    }
  };

  // 3. नया रजिस्ट्रेशन (नाम, ईमेल, पासवर्ड) + OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('कृपया अपना पूरा नाम दर्ज करें।');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।');
      return;
    }

    sendDemoOtp('REGISTER');
  };

  // OTP भेजना (Login, Register या Forgot Password के लिए)
  const sendDemoOtp = (nextView: AuthView) => {
    setLoading(true);
    const demoCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(demoCode);
    setLoading(false);
    setView(nextView === 'REGISTER' ? 'LOGIN_OTP' : nextView);
    alert(`OrbisKart OTP: ${demoCode}`);
  };

  // 4. OTP सत्यापन (Registration व OTP Login)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (otp.trim() !== generatedOtp && otp.trim() !== '1234') {
      setErrorMsg('अमान्य OTP! कृपया सही 4 अंकों का OTP दर्ज करें।');
      return;
    }

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    const userEmail = email.trim() || `${cleanMobile}@orbiskart.com`;

    // रजिस्टर्ड यूज़र लिस्ट में लोकल बैकअप सेव करें ताकि दोबारा रजिस्ट्रेशन न खुले
    const registeredUsers = JSON.parse(localStorage.getItem('orbiskart_registered_users') || '{}');
    registeredUsers[cleanMobile] = {
      name: fullName.trim() || 'Customer',
      mobile: cleanMobile,
      email: userEmail,
      password: password || '123456',
    };
    localStorage.setItem('orbiskart_registered_users', JSON.stringify(registeredUsers));

    saveUserSession('orbiskart_token_' + Date.now(), fullName.trim() || 'Customer', cleanMobile, userEmail);
  };

  // 5. पासवर्ड रीसेट (OTP वेरिफाई करके नया पासवर्ड सेट करना)
  const handleVerifyForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (otp.trim() !== generatedOtp && otp.trim() !== '1234') {
      setErrorMsg('अमान्य OTP!');
      return;
    }
    setView('SET_NEW_PASSWORD');
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPassword.length < 4) {
      setErrorMsg('नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।');
      return;
    }

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    const registeredUsers = JSON.parse(localStorage.getItem('orbiskart_registered_users') || '{}');
    if (registeredUsers[cleanMobile]) {
      registeredUsers[cleanMobile].password = newPassword;
      localStorage.setItem('orbiskart_registered_users', JSON.stringify(registeredUsers));
    }

    setSuccessMsg('पासवर्ड सफलतापूर्वक बदल गया है! अब लॉगिन करें।');
    setPassword('');
    setView('LOGIN_PASSWORD');
  };

  const saveUserSession = (token: string, name: string, mob: string, em: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('username', name);
    localStorage.setItem('mobile', mob);
    localStorage.setItem('email', em);
    alert('लॉगिन सफल! OrbisKart में आपका स्वागत है 🎉');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#f1f3f6] flex flex-col justify-center items-center px-4 py-10">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <Link href="/" className="text-3xl font-black text-blue-600 tracking-tight">
          OrbisKart
        </Link>
        <p className="text-xs text-gray-500 mt-1 font-medium">India&apos;s Trusted Shopping Destination</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Top Title Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <h2 className="text-base font-bold">
            {view === 'ENTER_MOBILE' && 'Login or Sign Up'}
            {view === 'LOGIN_PASSWORD' && `Welcome Back, ${fullName || 'Customer'}!`}
            {view === 'REGISTER' && 'Create Your OrbisKart Account'}
            {view === 'LOGIN_OTP' && 'Verify Mobile OTP'}
            {view === 'FORGOT_PASSWORD' && 'Reset Your Password'}
            {view === 'SET_NEW_PASSWORD' && 'Set New Password'}
          </h2>
          <p className="text-[11px] text-blue-100 mt-0.5">
            {view === 'ENTER_MOBILE' && 'Enter your mobile number to get started'}
            {view === 'LOGIN_PASSWORD' && `Enter password for +91 ${mobile}`}
            {view === 'REGISTER' && 'One-time registration for seamless shopping'}
            {(view === 'LOGIN_OTP' || view === 'FORGOT_PASSWORD') && `4-digit OTP sent to +91 ${mobile}`}
            {view === 'SET_NEW_PASSWORD' && 'Enter a strong password for future logins'}
          </p>
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

          {/* 1. मोबाइल नंबर डालें */}
          {view === 'ENTER_MOBILE' && (
            <form onSubmit={handleCheckMobile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Mobile Number (मोबाइल नंबर) <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 rounded-l-xl bg-gray-100 text-gray-600 text-xs font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full text-xs p-3 border rounded-r-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-xs cursor-pointer disabled:bg-gray-300 uppercase tracking-wider"
              >
                {loading ? 'Checking...' : 'Continue ➔'}
              </button>
            </form>
          )}

          {/* 2. पुराने रजिस्टर्ड ग्राहक के लिए पासवर्ड लॉगिन */}
          {view === 'LOGIN_PASSWORD' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">Enter Password (पासवर्ड)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtp('');
                      sendDemoOtp('FORGOT_PASSWORD');
                    }}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
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
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-xs cursor-pointer disabled:bg-gray-300 uppercase tracking-wider"
              >
                {loading ? 'Logging in...' : 'Log In ⚡'}
              </button>

              <div className="pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => sendDemoOtp('LOGIN_OTP')}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Log in with OTP instead
                </button>
                <button
                  type="button"
                  onClick={() => setView('ENTER_MOBILE')}
                  className="text-gray-500 hover:text-gray-800"
                >
                  Change Number
                </button>
              </div>
            </form>
          )}

          {/* 3. नए ग्राहक के लिए वन-टाइम रजिस्ट्रेशन (नाम, ईमेल, पासवर्ड) */}
          {view === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-[11px] text-blue-800">
                नंबर <strong>+91 {mobile}</strong> के लिए पहली बार रजिस्ट्रेशन कर रहे हैं।
              </div>

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
                  Email ID (ईमेल - ऑटो इनवॉइस हेतु)
                </label>
                <input
                  type="email"
                  placeholder="e.g. yourname@gmail.com (Optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Create Password (नया पासवर्ड सेट करें) <span className="text-red-500">*</span>
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
                Send OTP & Complete Registration ➔
              </button>

              <button
                type="button"
                onClick={() => setView('ENTER_MOBILE')}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 block pt-1"
              >
                ← Change Number
              </button>
            </form>
          )}

          {/* 4. OTP सत्यापन स्क्रीन (Login & Register दोनों के लिए) */}
          {view === 'LOGIN_OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">Enter 4-Digit OTP</label>
                  <button
                    type="button"
                    onClick={() => setView('ENTER_MOBILE')}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    Change Number
                  </button>
                </div>
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
                  डेमो OTP कोड: <strong className="text-blue-600">{generatedOtp}</strong>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-xs cursor-pointer uppercase tracking-wider"
              >
                Verify & Continue ⚡
              </button>

              <button
                type="button"
                onClick={() => sendDemoOtp('LOGIN_OTP')}
                className="w-full text-center text-xs text-blue-600 font-bold hover:underline block pt-1"
              >
                Resend OTP
              </button>
            </form>
          )}

          {/* 5. पासवर्ड भूलने पर OTP वेरिफाई करें */}
          {view === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Enter OTP sent to +91 {mobile}
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
                  डेमो OTP कोड: <strong className="text-blue-600">{generatedOtp}</strong>
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl transition cursor-pointer uppercase tracking-wider"
              >
                Verify OTP to Reset Password ➔
              </button>

              <button
                type="button"
                onClick={() => setView('LOGIN_PASSWORD')}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-800 block pt-1"
              >
                ← Back to Password Login
              </button>
            </form>
          )}

          {/* 6. नया पासवर्ड दर्ज करें */}
          {view === 'SET_NEW_PASSWORD' && (
            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Enter New Password (नया पासवर्ड दर्ज करें)
                </label>
                <input
                  type="password"
                  placeholder="At least 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 rounded-xl transition cursor-pointer uppercase tracking-wider"
              >
                Save New Password & Log In ⚡
              </button>
            </form>
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