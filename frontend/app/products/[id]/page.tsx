'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Review {
  id: number;
  username: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ProductDetail {
  id: number;
  title: string;
  description: string;
  price: string;
  original_price: string | null;
  image: string | null;
  stock: number;
  category_name?: string;
  average_rating: number;
  total_reviews: number;
  reviews: Review[];
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingCart, setAddingCart] = useState(false);

  // Review Form States
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/products/${id}/`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    setAddingCart(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/cart/add/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: product?.id, quantity: 1 }),
      });
      if (res.ok) {
        alert('उत्पाद कार्ट में जोड़ा गया! 🛒');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingCart(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('समीक्षा लिखने के लिए पहले लॉगिन करें।');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/products/${id}/reviews/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });

      if (res.ok) {
        setComment('');
        fetchProduct();
        alert('समीक्षा सफलतापूर्वक जोड़ी गई! ⭐');
      } else {
        const errData = await res.json();
        alert(errData.error || 'समीक्षा सबमिट नहीं हो सकी।');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Loading product details...</div>;
  }

  if (!product) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Product not found.</div>;
  }

  const imageUrl = product.image
    ? (product.image.startsWith('http') ? product.image : `http://127.0.0.1:8000${product.image}`)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black text-blue-600">
            MegaStore
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-sm font-semibold text-gray-700 hover:text-blue-600">
              Home
            </Link>
            <Link href="/cart" className="text-sm font-bold bg-blue-50 text-blue-600 px-3.5 py-1.5 rounded-lg border border-blue-200">
              🛒 Cart
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-10">
        <div className="bg-white border rounded-3xl p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-gray-50 border rounded-2xl p-6 flex items-center justify-center min-h-[380px]">
            {imageUrl ? (
              <img src={imageUrl} alt={product.title} className="max-h-96 object-contain rounded-xl" />
            ) : (
              <span className="text-gray-400 font-bold">No Image Available</span>
            )}
          </div>

          <div className="flex flex-col justify-between">
            <div>
              {product.category_name && (
                <span className="inline-block bg-blue-50 text-blue-600 text-xs font-black uppercase px-3 py-1 rounded-full mb-3">
                  {product.category_name}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">{product.title}</h1>

              <div className="flex items-center space-x-3 mb-6">
                <div className="flex items-center bg-green-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                  <span>{product.average_rating > 0 ? product.average_rating : 'New'}</span>
                  <span className="ml-1">★</span>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  {product.total_reviews} Ratings & Reviews
                </span>
              </div>

              <div className="bg-gray-50 border rounded-2xl p-5 mb-6">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-black text-gray-900">₹{product.price}</span>
                  {product.original_price && (
                    <span className="text-sm text-gray-400 line-through">₹{product.original_price}</span>
                  )}
                  <span className="text-xs font-bold text-green-600">Inclusive of 18% GST</span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xs uppercase font-bold text-gray-400 mb-2">Description</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{product.description}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={handleAddToCart}
                disabled={addingCart}
                className="w-full bg-blue-600 text-white font-extrabold text-sm py-4 rounded-xl hover:bg-blue-700 transition shadow-md disabled:bg-blue-300"
              >
                {addingCart ? 'Adding...' : 'Add to Cart 🛒'}
              </button>
            </div>
          </div>
        </div>

        <section className="mt-12 bg-white border rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6">Customer Reviews & Ratings</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-gray-50 border rounded-2xl p-6 h-fit">
              <h3 className="font-extrabold text-sm text-gray-900 mb-4">Rate this Product</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Rating</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full bg-white border rounded-lg p-2 text-sm font-bold text-gray-800"
                  >
                    <option value={5}>5 ★★★★★ (Excellent)</option>
                    <option value={4}>4 ★★★★☆ (Good)</option>
                    <option value={3}>3 ★★★☆☆ (Average)</option>
                    <option value={2}>2 ★★☆☆☆ (Poor)</option>
                    <option value={1}>1 ★☆☆☆☆ (Terrible)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Your Review</label>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write your honest feedback..."
                    className="w-full bg-white border rounded-lg p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-gray-900 text-white font-bold text-xs py-2.5 rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-4">
              {product.reviews.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium">
                  अभी तक कोई समीक्षा नहीं लिखी गई है। पहले समीक्षक बनें!
                </div>
              ) : (
                product.reviews.map((rev) => (
                  <div key={rev.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <div className="bg-green-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                        {rev.rating} ★
                      </div>
                      <span className="font-extrabold text-xs text-gray-900">{rev.username}</span>
                      <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        ✓ Verified Buyer
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 mt-1">{rev.comment}</p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {new Date(rev.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}