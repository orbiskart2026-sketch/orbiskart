'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<string>('Guest User');
  const [email, setEmail] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [cartCount, setCartCount] = useState<number>(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('username');
    const storedEmail = localStorage.getItem('email');
    const storedMobile = localStorage.getItem('mobile') || localStorage.getItem('phone');

    if (storedUser) setUser(storedUser);
    if (storedEmail) setEmail(storedEmail);
    if (storedMobile) setMobile(storedMobile);

    try {
      const cart = JSON.parse(localStorage.getItem('user_cart_items') || '[]');
      setCartCount(cart.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0));
    } catch {}
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('mobile');
    localStorage.removeItem('email');
    router.push('/login');
  };

  const accountMenu = [
    { title: 'Orders', desc: 'Check order status & track delivery', icon: '📦', link: '/orders' },
    { title: 'Customer Care', desc: 'Help center, FAQs & live support', icon: '🎧', link: '#' },
    { title: 'Address Book', desc: 'Manage delivery addresses', icon: '📍', link: '/cart' },
    { title: 'OrbisKart Wallet', desc: 'Manage refunds and store credits', icon: '👛', link: '#' },
    { title: 'Saved Cards & UPI', desc: 'Secure payment settings', icon: '💳', link: '#' },
    { title: 'Notifications', desc: 'Offers, order updates & alerts', icon: '🔔', link: '#' },
  ];

  const policyMenu = [
    { title: 'Return Creation Demo', link: '#' },
    { title: 'How To Return', link: '#' },
    { title: 'How Do I Redeem My Coupon?', link: '#' },
    { title: 'Terms & Conditions', link: '#' },
    { title: 'Returns & Refunds Policy', link: '#' },
    { title: 'We Respect Your Privacy', link: '#' },
    { title: 'Fees & Payments', link: '#' },
    { title: 'Delivery and Shipping Policy', link: '#' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f9] text-gray-900 pb-24">
      {/* Top Bar */}
      <header className="bg-white border-b sticky top-0 z-40 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <h1 className="text-base font-black text-gray-900 tracking-tight">My Account</h1>
        <Link href="/" className="text-xs font-bold text-blue-600">
          Done
        </Link>
      </header>

      <main className="max-w-xl mx-auto">
        {/* User Profile Card */}
        <div className="bg-white px-5 py-6 border-b flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center font-black text-xl tracking-wider shadow-sm flex-shrink-0">
              {getInitials(user)}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{user}</h2>
              {email && <p className="text-xs text-gray-500 mt-0.5">{email}</p>}
              {mobile && <p className="text-xs text-gray-500">{mobile}</p>}
            </div>
          </div>
          <Link href="/login" className="text-xs font-bold text-blue-600 hover:underline">
            Switch
          </Link>
        </div>

        {/* Core Account Menu List */}
        <div className="bg-white mt-2 border-y divide-y divide-gray-100 shadow-xs">
          {accountMenu.map((item, idx) => (
            <Link
              key={idx}
              href={item.link}
              className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-[11px] text-gray-400">{item.desc}</p>
                </div>
              </div>
              <span className="text-gray-400 font-bold text-sm">›</span>
            </Link>
          ))}
        </div>

        {/* Promotional Banner */}
        <div className="mx-4 my-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded">
              OrbisKart Express
            </span>
            <h4 className="text-xs font-bold mt-1">Superfast Same-Day Delivery</h4>
            <p className="text-[10px] opacity-90">Available across selected pin codes</p>
          </div>
          <span className="text-2xl">⚡</span>
        </div>

        {/* Policy & Help Menu */}
        <div className="bg-white border-y divide-y divide-gray-100 shadow-xs">
          {policyMenu.map((item, idx) => (
            <Link
              key={idx}
              href={item.link}
              className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer text-xs font-medium text-gray-700"
            >
              <span>{item.title}</span>
              <span className="text-gray-400 font-bold text-sm">›</span>
            </Link>
          ))}
        </div>

        {/* Logout Button */}
        <div className="p-5">
          <button
            onClick={handleLogout}
            className="w-full py-3 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-xs transition cursor-pointer uppercase tracking-wider"
          >
            Log Out
          </button>
        </div>
      </main>

      {/* Ajio-Style Fixed Bottom App Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1.5 flex items-center justify-around z-50 max-w-xl mx-auto shadow-lg">
        <Link href="/" className="flex flex-col items-center group py-1 flex-1">
          <span className="text-base text-gray-500 group-hover:text-blue-600">🏠</span>
          <span className="text-[10px] font-medium text-gray-500 group-hover:text-blue-600">Home</span>
        </Link>
        <Link href="/?filter=trending" className="flex flex-col items-center group py-1 flex-1">
          <span className="text-base text-gray-500 group-hover:text-blue-600">🔥</span>
          <span className="text-[10px] font-medium text-gray-500 group-hover:text-blue-600">Right Now</span>
        </Link>
        <Link href="/cart" className="flex flex-col items-center group py-1 relative flex-1">
          <span className="text-base text-gray-500 group-hover:text-blue-600">🛒</span>
          <span className="text-[10px] font-medium text-gray-500 group-hover:text-blue-600">Cart</span>
          {cartCount > 0 && (
            <span className="absolute top-0 right-4 bg-red-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>
        <Link href="/orders" className="flex flex-col items-center group py-1 flex-1">
          <span className="text-base text-gray-500 group-hover:text-blue-600">📦</span>
          <span className="text-[10px] font-medium text-gray-500 group-hover:text-blue-600">Orders</span>
        </Link>
        <Link href="/account" className="flex flex-col items-center py-1 flex-1">
          <span className="text-base text-blue-600 font-bold">👤</span>
          <span className="text-[10px] font-bold text-blue-600">Account</span>
        </Link>
      </nav>
    </div>
  );
}