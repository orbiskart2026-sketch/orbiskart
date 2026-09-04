'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  original_price: string | null;
  image: string | null;
  stock: number;
  category_name?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://orbiskart.onrender.com';

// Flipkart / Amazon / Ajio स्टाइल सभी कैटेगरीज + Gifts
const DEFAULT_TOP_CATEGORIES = [
  { key: 'all', name: 'All Store', icon: '🛍️' },
  { key: 'gifts', name: 'Gift Store', icon: '🎁' },
  { key: 'men', name: 'Men', icon: '👔' },
  { key: 'women', name: 'Women', icon: '👗' },
  { key: 'boys', name: 'Boys', icon: '👦' },
  { key: 'girls', name: 'Girls', icon: '👧' },
  { key: 'kids', name: 'Kids & Toys', icon: '🧸' },
  { key: 'sports', name: 'Sports', icon: '⚽' },
  { key: 'riding', name: 'Riding & Bikes', icon: '🏍️' },
  { key: 'books', name: 'Books', icon: '📚' },
  { key: 'stationery', name: 'Stationery', icon: '✏️' },
  { key: 'kitchen', name: 'Kitchen', icon: '🍳' },
  { key: 'machinery', name: 'Machinery & Tools', icon: '⚙️' },
  { key: 'nursery', name: 'Nursery & Plants', icon: '🌱' },
  { key: 'medicine', name: 'Medicines', icon: '💊' },
  { key: 'mobiles', name: 'Mobiles', icon: '📱' },
  { key: 'electronics', name: 'Electronics', icon: '💻' },
  { key: 'grocery', name: 'Grocery', icon: '🛒' },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // User details & Dynamic Greeting
  const [user, setUser] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [mobile, setMobile] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Good Day');

  // Filters & Toggles
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterType, setFilterType] = useState<'all' | 'trending' | 'price_drop'>('all');
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [addingId, setAddingId] = useState<number | null>(null);

  // समय के अनुसार Wishes (Morning / Afternoon / Evening)
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) {
      setGreeting('Good Morning ☀️');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon 🌤️');
    } else {
      setGreeting('Good Evening 🌙');
    }

    // लोकल स्टोरेज से यूज़र डेटा लोड करें
    const storedUser = localStorage.getItem('username');
    const storedEmail = localStorage.getItem('email');
    const storedMobile = localStorage.getItem('mobile') || localStorage.getItem('phone');
    const storedWishlist = localStorage.getItem('wishlist_items');

    if (storedUser) setUser(storedUser);
    if (storedEmail) setEmail(storedEmail);
    if (storedMobile) setMobile(storedMobile);
    if (storedWishlist) {
      try {
        setWishlist(JSON.parse(storedWishlist));
      } catch {
        setWishlist([]);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setEmail(null);
    setMobile(null);
    window.location.reload();
  };

  const toggleWishlist = (productId: number) => {
    let updated: number[];
    if (wishlist.includes(productId)) {
      updated = wishlist.filter((id) => id !== productId);
    } else {
      updated = [...wishlist, productId];
    }
    setWishlist(updated);
    localStorage.setItem('wishlist_items', JSON.stringify(updated));
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.append('search', search.trim());
      if (selectedCategory !== 'all') queryParams.append('category', selectedCategory);
      if (sortBy !== 'newest') queryParams.append('sort', sortBy);

      const res = await fetch(`${API_BASE_URL}/api/products/?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let fetched: Product[] = [];
        if (data.products) {
          fetched = data.products;
          setCategories(data.categories || []);
        } else if (Array.isArray(data)) {
          fetched = data;
        }

        // Trending या Price Drop फ़िल्टर क्लाइंट-साइड अप्लाई करें
        if (filterType === 'price_drop') {
          fetched = fetched.filter(
            (p) => p.original_price && parseFloat(p.original_price) > parseFloat(p.price)
          );
        }

        setProducts(fetched);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, sortBy, filterType]);

  const handleAddToCart = async (productId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('कृपया पहले लॉगिन करें।');
      return;
    }

    setAddingId(productId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/add/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });

      if (res.ok) {
        alert('उत्पाद कार्ट में जोड़ा गया! 🛒');
      } else {
        alert('कार्ट में जोड़ने में विफल।');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-gray-900 pb-20">
      {/* Top Navbar */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-black text-blue-600 flex-shrink-0 tracking-tight">
            MegaStore
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl relative">
            <input
              type="text"
              placeholder="Search gifts, trends, electronics, fashion, medicines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
            />
            <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">🔍</span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-2 text-xs text-gray-400 hover:text-gray-700 bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* User Nav with Dynamic Greeting, Email & Mobile */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {user ? (
              <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-3.5 py-1.5 rounded-xl shadow-xs">
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-extrabold text-blue-800">
                    {greeting}, {user}!
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {email && (
                      <span className="text-[10px] text-gray-600 font-medium truncate max-w-[120px]">
                        ✉️ {email}
                      </span>
                    )}
                    {mobile && (
                      <span className="text-[10px] text-gray-600 font-medium">
                        📞 {mobile}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-sm font-semibold text-blue-600 hover:underline">
                Sign In
              </Link>
            )}

            <Link href="/orders" className="text-sm font-semibold text-gray-700 hover:text-blue-600">
              My Orders
            </Link>
            <Link
              href="/cart"
              className="text-sm font-bold bg-blue-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-blue-700 shadow-sm transition"
            >
              🛒 Cart
            </Link>
          </div>
        </div>

        {/* Categories Bar (Flipkart / Amazon / Ajio Style) */}
        <div className="bg-white border-t border-gray-100 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-5 overflow-x-auto no-scrollbar py-1">
              {DEFAULT_TOP_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className="flex flex-col items-center space-y-1 min-w-[55px] cursor-pointer group transition"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-xl border transition ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white scale-105 shadow-xs'
                          : 'bg-gray-50 border-gray-200 group-hover:border-blue-400 group-hover:bg-blue-50'
                      }`}
                    >
                      {cat.icon}
                    </div>
                    <span
                      className={`text-[11px] font-semibold tracking-tight whitespace-nowrap ${
                        isActive ? 'text-blue-600 font-bold' : 'text-gray-600 group-hover:text-blue-600'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}

              {/* Dynamic categories from backend */}
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id.toString();
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id.toString())}
                    className="flex flex-col items-center space-y-1 min-w-[55px] cursor-pointer group transition"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border transition ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-gray-50 border-gray-200 group-hover:border-blue-400 group-hover:bg-blue-50 text-gray-700'
                      }`}
                    >
                      🏷️
                    </div>
                    <span
                      className={`text-[11px] font-semibold tracking-tight whitespace-nowrap ${
                        isActive ? 'text-blue-600 font-bold' : 'text-gray-600 group-hover:text-blue-600'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sort Filter */}
            <div className="flex items-center space-x-2 flex-shrink-0 pl-4 border-l border-gray-200">
              <span className="text-xs font-bold text-gray-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-bold bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="newest">Newest</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trending & Price Drop Special Strip */}
        <div className="bg-slate-50 border-t border-b border-gray-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Filters:</span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Products
              </button>
              <button
                onClick={() => setFilterType('trending')}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  filterType === 'trending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-amber-50'
                }`}
              >
                🔥 Trending Deals
              </button>
              <button
                onClick={() => setFilterType('price_drop')}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  filterType === 'price_drop'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-emerald-50'
                }`}
              >
                📉 Price Drop Alert
              </button>
            </div>

            <div className="text-xs font-semibold text-gray-600">
              Wishlist: <span className="text-red-500 font-bold">{wishlist.length}</span> items
            </div>
          </div>
        </div>
      </header>

      {/* Main Catalog Grid */}
      <main className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">
            {search
              ? `Search results for "${search}"`
              : filterType === 'trending'
              ? '🔥 Trending Right Now'
              : filterType === 'price_drop'
              ? '📉 Huge Price Drops & Deals'
              : 'Deals of the Day'}
          </h2>
          <span className="text-xs font-bold text-gray-500">{products.length} Products Found</span>
        </div>

        {loading ? (
          <div className="text-center py-24 text-gray-400 font-bold">Loading best deals...</div>
        ) : products.length === 0 ? (
          <div className="bg-white border rounded-2xl p-16 text-center shadow-sm">
            <span className="text-4xl block mb-3">🔍</span>
            <p className="text-gray-700 font-bold text-lg">कोई उत्पाद नहीं मिला।</p>
            <p className="text-gray-400 text-sm mt-1">कृपया कोई दूसरा सर्च शब्द या फ़िल्टर आज़माएँ।</p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setFilterType('all');
              }}
              className="mt-4 inline-block bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-xs hover:bg-blue-700 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((product) => {
              const imageUrl = product.image
                ? product.image.startsWith('http')
                  ? product.image
                  : `${API_BASE_URL}${product.image}`
                : null;

              const isFav = wishlist.includes(product.id);
              const hasPriceDrop =
                product.original_price && parseFloat(product.original_price) > parseFloat(product.price);

              return (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs hover:shadow-md transition flex flex-col justify-between relative group"
                >
                  {/* Like / Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    title={isFav ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-xs hover:scale-110 transition cursor-pointer"
                  >
                    <span className={isFav ? 'text-red-500 text-base' : 'text-gray-300 hover:text-red-400 text-base'}>
                      {isFav ? '❤️' : '🤍'}
                    </span>
                  </button>

                  <div>
                    <div className="w-full h-40 bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                      {imageUrl ? (
                        <img src={imageUrl} alt={product.title} className="w-full h-full object-contain p-2" />
                      ) : (
                        <span className="text-xs text-gray-400 font-bold">No Image</span>
                      )}

                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.category_name && (
                          <span className="bg-white/95 text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs text-gray-700">
                            {product.category_name}
                          </span>
                        )}
                        {hasPriceDrop && (
                          <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs">
                            PRICE DROP
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-900 text-xs mb-1 line-clamp-2">{product.title}</h3>
                    <p className="text-gray-500 text-[11px] line-clamp-1 mb-2">{product.description}</p>
                  </div>

                  <div>
                    <div className="flex items-baseline space-x-2 mb-3">
                      <span className="text-base font-black text-gray-900">₹{product.price}</span>
                      {product.original_price && (
                        <span className="text-[11px] text-gray-400 line-through">₹{product.original_price}</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleAddToCart(product.id)}
                      disabled={addingId === product.id}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-xs py-2 rounded-lg transition disabled:bg-gray-200 shadow-xs cursor-pointer"
                    >
                      {addingId === product.id ? 'Adding...' : 'Add to Cart 🛒'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}