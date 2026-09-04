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

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [addingId, setAddingId] = useState<number | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.append('search', search.trim());
      if (selectedCategory !== 'all') queryParams.append('category', selectedCategory);
      if (sortBy !== 'newest') queryParams.append('sort', sortBy);

      const res = await fetch(`${apiUrl}/api/products/?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProducts(data);
        } else if (data && Array.isArray(data.products)) {
          setProducts(data.products);
          setCategories(data.categories || []);
        } else {
          setProducts([]);
        }
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, sortBy]);

  const handleAddToCart = async (productId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('कृपया पहले लॉगिन करें।');
      return;
    }

    setAddingId(productId);
    try {
      const res = await fetch(`${apiUrl}/api/cart/add/`, {
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
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-black text-blue-600 flex-shrink-0">
            MegaStore
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl relative">
            <input
              type="text"
              placeholder="Search products, categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-full text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">🔍</span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-2.5 text-xs text-gray-400 hover:text-gray-700 bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center space-x-5 flex-shrink-0">
            <Link href="/orders" className="text-sm font-semibold text-gray-700 hover:text-blue-600">
              My Orders
            </Link>
            <Link href="/cart" className="text-sm font-bold bg-blue-50 text-blue-600 px-3.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition">
              🛒 Cart
            </Link>
          </div>
        </div>

        {/* Category & Sorting Bar */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-t bg-white">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {Array.isArray(categories) && categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id.toString())}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat.id.toString()
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-bold bg-gray-50 border rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </header>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-gray-900">
            {search ? `Search results for "${search}"` : 'Explore Products'}
          </h2>
          <span className="text-xs font-bold text-gray-500">{Array.isArray(products) ? products.length : 0} Products</span>
        </div>

        {loading ? (
          <div className="text-center py-24 text-gray-400 font-bold">Finding best matches...</div>
        ) : !Array.isArray(products) || products.length === 0 ? (
          <div className="bg-white border rounded-2xl p-16 text-center shadow-sm">
            <span className="text-4xl block mb-3">🔍</span>
            <p className="text-gray-700 font-bold text-lg">कोई उत्पाद नहीं मिला।</p>
            <p className="text-gray-400 text-sm mt-1">कृपया कोई दूसरा सर्च शब्द या फ़िल्टर आज़माएँ।</p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory('all'); }}
              className="mt-4 inline-block bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-xs hover:bg-blue-700 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((item) => {
              const imageUrl = item.image
                ? (item.image.startsWith('http') ? item.image : `${apiUrl}${item.image}`)
                : null;

              return (
                <div
                  key={item.id}
                  className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <Link href={`/products/${item.id}`} className="group block">
                      <div className="w-full h-48 bg-gray-100 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                          />
                        ) : (
                          <span className="text-xs text-gray-400 font-bold">No Image</span>
                        )}
                        {item.category_name && (
                          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs text-gray-700">
                            {item.category_name}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-blue-600 transition">
                        {item.title}
                      </h3>
                    </Link>
                    <p className="text-gray-500 text-xs line-clamp-2 mb-3">{item.description}</p>
                  </div>

                  <div>
                    <div className="flex items-baseline space-x-2 mb-4">
                      <span className="text-lg font-black text-gray-900">₹{item.price}</span>
                      {item.original_price && (
                        <span className="text-xs text-gray-400 line-through">₹{item.original_price}</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleAddToCart(item.id)}
                      disabled={addingId === item.id}
                      className="w-full bg-blue-600 text-white font-bold text-xs py-2.5 rounded-xl hover:bg-blue-700 transition disabled:bg-blue-300 shadow-sm"
                    >
                      {addingId === item.id ? 'Adding...' : 'Add to Cart 🛒'}
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