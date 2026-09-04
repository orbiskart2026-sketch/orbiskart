'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

// Flipkart / Amazon / Ajio / Myntra स्टाइल पूरी कैटेगरी लिस्ट (Fashion, Sarees & Suits, Jewellery सहित)
const DEFAULT_TOP_CATEGORIES = [
  { key: 'all', name: 'All Store', icon: '🛍️' },
  { key: 'fashion', name: 'Fashion', icon: '👗' },
  { key: 'sarees_suits', name: 'Sarees & Suits', icon: '🥻' },
  { key: 'jewellery', name: 'Jewellery', icon: '💍' },
  { key: 'gifts', name: 'Gift Store', icon: '🎁' },
  { key: 'men', name: 'Men', icon: '👔' },
  { key: 'women', name: 'Women', icon: '👚' },
  { key: 'boys', name: 'Boys', icon: '👦' },
  { key: 'girls', name: 'Girls', icon: '👧' },
  { key: 'kids', name: 'Kids & Toys', icon: '🧸' },
  { key: 'sports', name: 'Sports', icon: '⚽' },
  { key: 'riding', name: 'Riding & Bikes', icon: '🏍️' },
  { key: 'books', name: 'Books', icon: '📚' },
  { key: 'stationery', name: 'Stationery', icon: '✏️' },
  { key: 'kitchen', name: 'Kitchen', icon: '🍳' },
  { key: 'machinery', name: 'Machinery', icon: '⚙️' },
  { key: 'nursery', name: 'Nursery', icon: '🌱' },
  { key: 'medicine', name: 'Medicines', icon: '💊' },
  { key: 'mobiles', name: 'Mobiles', icon: '📱' },
  { key: 'electronics', name: 'Electronics', icon: '💻' },
  { key: 'grocery', name: 'Grocery', icon: '🛒' },
];

export default function HomePage() {
  const router = useRouter();
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // User details & Dynamic Greeting
  const [user, setUser] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [mobile, setMobile] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Good Day');

  // Badges & Counters
  const [cartCount, setCartCount] = useState<number>(0);
  const [wishlist, setWishlist] = useState<number[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterType, setFilterType] = useState<'all' | 'trending' | 'price_drop'>('all');
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) {
      setGreeting('Good Morning ☀️');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon 🌤️');
    } else {
      setGreeting('Good Evening 🌙');
    }

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

    fetchCartCount();
  }, []);

  const fetchCartCount = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const itemsList = Array.isArray(data) ? data : data.items || [];
        const totalItems = itemsList.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartCount(totalItems);
      }
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setEmail(null);
    setMobile(null);
    setCartCount(0);
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

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setFilterType('all');
    setSearch('');
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.append('search', search.trim());
      if (selectedCategory !== 'all' && selectedCategory !== 'gifts') {
        queryParams.append('category', selectedCategory);
      }
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
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, sortBy, filterType]);

  const handleAddToCart = async (productId: number, redirectToCart = false) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('कृपया पहले लॉगिन करें।');
      router.push('/login');
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
        setCartCount((prev) => prev + 1);
        if (redirectToCart) {
          router.push('/cart');
        } else {
          alert('उत्पाद कार्ट में जोड़ा गया! 🛒');
        }
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
      {/* Header with OrbisKart Branding */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="text-xl sm:text-2xl font-black text-blue-600 flex-shrink-0 tracking-tight">
            OrbisKart
          </Link>

          {/* Search Box */}
          <div className="flex-1 max-w-lg relative">
            <input
              type="text"
              placeholder="Search sarees, suits, jewellery, fashion, electronics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 sm:py-2 border border-gray-300 rounded-full text-xs sm:text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2 sm:top-2.5 text-gray-400 text-xs sm:text-sm">🔍</span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-[10px] text-gray-400 bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* User Nav */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {user ? (
              <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 px-2 sm:px-3 py-1 rounded-xl">
                <span className="text-[10px] sm:text-xs font-bold text-blue-800">
                  {greeting}, {user}!
                </span>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] sm:text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-xs sm:text-sm font-semibold text-blue-600 hover:underline">
                Sign In
              </Link>
            )}

            <Link href="/orders" className="hidden sm:inline-block text-xs font-semibold text-gray-700 hover:text-blue-600">
              Orders
            </Link>

            <Link
              href="/cart"
              className="relative flex items-center gap-1 text-xs sm:text-sm font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-xs hover:bg-blue-700 transition"
            >
              <span>🛒</span>
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-xs">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Categories Bar with Left & Right Arrows (Sarees, Suits, Jewellery Added) */}
        <div className="bg-white border-t border-gray-100 relative">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex items-center justify-between">
            {/* Left Scroll Arrow */}
            <button
              onClick={() => scrollCategories('left')}
              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full flex-shrink-0 cursor-pointer font-bold text-base"
              title="पीछे देखें"
            >
              ❮
            </button>

            {/* Scrollable Container */}
            <div
              ref={categoryScrollRef}
              className="flex items-center space-x-4 sm:space-x-6 overflow-x-auto no-scrollbar scroll-smooth py-1 px-2 mx-1 flex-1"
            >
              {DEFAULT_TOP_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      if (cat.key === 'all') {
                        resetAllFilters();
                      } else {
                        setSelectedCategory(cat.key);
                      }
                    }}
                    className="flex flex-col items-center space-y-1 min-w-[55px] cursor-pointer group flex-shrink-0"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-xl border transition ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white scale-105 shadow-sm'
                          : 'bg-gray-50 border-gray-200 group-hover:border-blue-400 group-hover:bg-blue-50'
                      }`}
                    >
                      {cat.icon}
                    </div>
                    <span
                      className={`text-[11px] font-semibold whitespace-nowrap ${
                        isActive ? 'text-blue-600 font-bold' : 'text-gray-600 group-hover:text-blue-600'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}

              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id.toString();
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id.toString())}
                    className="flex flex-col items-center space-y-1 min-w-[55px] cursor-pointer group flex-shrink-0"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border transition ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-gray-50 border-gray-200 group-hover:border-blue-400 text-gray-700'
                      }`}
                    >
                      🏷️
                    </div>
                    <span
                      className={`text-[11px] font-semibold whitespace-nowrap ${
                        isActive ? 'text-blue-600 font-bold' : 'text-gray-600'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Arrow */}
            <button
              onClick={() => scrollCategories('right')}
              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full flex-shrink-0 cursor-pointer font-bold text-base"
              title="आगे देखें"
            >
              ❯
            </button>

            {/* Sort Dropdown */}
            <div className="hidden md:flex items-center space-x-1 pl-3 border-l border-gray-200 flex-shrink-0">
              <span className="text-[11px] font-bold text-gray-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-bold bg-gray-50 border rounded-lg px-2 py-1 text-gray-700 focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="bg-slate-50 border-t border-b border-gray-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:inline">Filters:</span>
              <button
                onClick={resetAllFilters}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  filterType === 'all' && selectedCategory === 'all'
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
                🔥 Trending
              </button>
              <button
                onClick={() => setFilterType('price_drop')}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  filterType === 'price_drop'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-emerald-50'
                }`}
              >
                📉 Price Drop
              </button>
            </div>

            <div className="text-xs font-semibold text-gray-600 whitespace-nowrap">
              Wishlist: <span className="text-red-500 font-bold">{wishlist.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Catalog Grid */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-800">
            {search
              ? `Results for "${search}"`
              : selectedCategory !== 'all'
              ? `Category: ${selectedCategory.toUpperCase()}`
              : filterType === 'trending'
              ? '🔥 Trending Right Now'
              : filterType === 'price_drop'
              ? '📉 Price Drops'
              : 'Deals of the Day'}
          </h2>
          <span className="text-xs font-bold text-gray-500">{products.length} Products</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 font-bold">Loading deals...</div>
        ) : products.length === 0 ? (
          <div className="bg-white border rounded-2xl p-12 text-center shadow-sm">
            <span className="text-4xl block mb-2">🔍</span>
            <p className="text-gray-700 font-bold text-sm">इस श्रेणी में कोई उत्पाद नहीं मिला।</p>
            <button
              onClick={resetAllFilters}
              className="mt-3 inline-block bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-xs hover:bg-blue-700 cursor-pointer"
            >
              सभी उत्पाद देखें (All Products)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
                  className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs hover:shadow-md transition flex flex-col justify-between relative"
                >
                  {/* Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 shadow-xs flex items-center justify-center text-sm cursor-pointer"
                  >
                    {isFav ? '❤️' : '🤍'}
                  </button>

                  <div>
                    <div className="w-full h-36 sm:h-40 bg-gray-50 rounded-lg mb-2.5 flex items-center justify-center overflow-hidden relative">
                      {imageUrl ? (
                        <img src={imageUrl} alt={product.title} className="w-full h-full object-contain p-2" />
                      ) : (
                        <span className="text-xs text-gray-400 font-bold">No Image</span>
                      )}

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
                    <div className="flex items-baseline space-x-2 mb-2.5">
                      <span className="text-sm sm:text-base font-black text-gray-900">₹{product.price}</span>
                      {product.original_price && (
                        <span className="text-[10px] sm:text-[11px] text-gray-400 line-through">
                          ₹{product.original_price}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5 sm:gap-2">
                      <button
                        onClick={() => handleAddToCart(product.id, false)}
                        disabled={addingId === product.id}
                        className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-[11px] sm:text-xs py-2 rounded-lg transition cursor-pointer"
                      >
                        {addingId === product.id ? '...' : 'Add to Cart 🛒'}
                      </button>

                      <button
                        onClick={() => handleAddToCart(product.id, true)}
                        disabled={addingId === product.id}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] sm:text-xs py-2 rounded-lg transition cursor-pointer"
                      >
                        ⚡ Buy Now
                      </button>
                    </div>
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