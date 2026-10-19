import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  ShoppingBag,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Check,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Send,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api';
import { Product, Review } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { ProductCard } from '../components/product/ProductCard';

interface ProductDetailPageProps {
  onOpenAuth: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ onOpenAuth }) => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const navigate = useNavigate();
  const { addToCart, setIsCartDrawerOpen } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'material' | 'shipping' | 'sizing'>('desc');

  // Review Form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      if (!idOrSlug) return;
      try {
        setLoading(true);
        const res = await api.products.get(idOrSlug);
        if (res.success && res.product) {
          setProduct(res.product);
          setRelated(res.related || []);
          setReviews(res.reviews || []);
          setActiveImage(res.product.images?.[0] || '');
          setSelectedSize(res.product.sizes?.[0] || 'M');
          const firstColor = res.product.colors?.[0];
          setSelectedColor(typeof firstColor === 'string' ? firstColor : firstColor?.name || 'Default');
        }
      } catch (err) {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
    window.scrollTo(0, 0);
  }, [idOrSlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-3/4 bg-stone-200 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-stone-200 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-stone-200 rounded w-1/4 animate-pulse" />
            <div className="h-32 bg-stone-200 rounded w-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Garment Not Found</h2>
        <p className="text-xs text-stone-500 mt-2">
          The requested luxury piece is unavailable or has been archived.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-block px-6 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-semibold"
        >
          Return to Collections
        </Link>
      </div>
    );
  }

  const inWishlist = isInWishlist(product._id);
  const price = product.salePrice || product.price;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold || 5);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    await addToCart(product._id, selectedSize, selectedColor, quantity);
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    const added = await addToCart(product._id, selectedSize, selectedColor, quantity);
    if (added) {
      navigate('/checkout');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await api.reviews.submit({
        productId: product._id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });
      if (res.success && res.review) {
        setReviews([res.review, ...reviews]);
        setShowReviewForm(false);
        setReviewTitle('');
        setReviewComment('');
        setReviewSuccessMsg('Your feedback has been verified and published.');
        setTimeout(() => setReviewSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="text-xs text-stone-500 mb-6 flex items-center space-x-1.5">
          <Link to="/" className="hover:text-stone-900">Home</Link>
          <span>/</span>
          <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-stone-900">
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-stone-900 font-medium truncate">{product.name}</span>
        </div>

        {/* Product Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 bg-white p-6 sm:p-10 rounded-2xl border border-stone-200/80 shadow-2xs">
          {/* Gallery - Left (5 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="aspect-3/4 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
              <img
                src={activeImage || product.images?.[0]}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Thumbnail selector */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`w-20 h-24 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                      activeImage === img ? 'border-stone-900 scale-105' : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Configuration & Actions - Right (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 text-xs text-stone-500 mb-1">
                  <span className="font-bold text-stone-900 uppercase tracking-widest">{product.brand}</span>
                  <span>·</span>
                  <span>SKU: {product.sku}</span>
                  <span>·</span>
                  <span>{product.gender}</span>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(product.rating || 5) ? 'fill-current' : 'text-stone-300'
                      }`}
                    />
                  ))}
                  <span className="ml-1.5 font-bold text-stone-900">
                    {product.rating > 0 ? product.rating.toFixed(1) : '5.0'}
                  </span>
                </div>
                <span className="text-stone-300">·</span>
                <a href="#reviews" className="text-stone-600 hover:text-stone-900 underline">
                  {reviews.length} Verified Atelier Reviews
                </a>
              </div>

              {/* Price */}
              <div className="flex items-baseline space-x-3 pt-2">
                <span className="text-3xl font-bold text-stone-950">₹{price.toFixed(2)}</span>
                {product.discount > 0 && (
                  <>
                    <span className="text-base text-stone-400 line-through">₹{product.price.toFixed(2)}</span>
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md">
                      Special Saving -{product.discount}%
                    </span>
                  </>
                )}
              </div>

              {/* Short Description */}
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pt-1">
                {product.shortDescription || product.description}
              </p>

              {/* Stock Status Bar */}
              <div className="pt-2">
                {isOutOfStock ? (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    <span>Out of Stock</span>
                  </div>
                ) : isLowStock ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Low Stock Alert: Only {product.stock} pieces remaining</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>In Stock · Prepared in European atelier, ships within 24h</span>
                  </div>
                )}
              </div>

              {/* Color Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-900 mb-2">
                    Color: <span className="font-normal text-stone-600 capitalize">{selectedColor}</span>
                  </label>
                  <div className="flex gap-2.5">
                    {product.colors.map((c, i) => {
                      const cName = typeof c === 'string' ? c : c.name;
                      const cHex = typeof c === 'string' ? '#333' : c.hex;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedColor(cName)}
                          title={cName}
                          className={`w-8 h-8 rounded-full border-2 p-0.5 transition-all ${
                            selectedColor === cName ? 'border-stone-900 scale-110' : 'border-stone-300 hover:scale-105'
                          }`}
                        >
                          <span className="block w-full h-full rounded-full" style={{ backgroundColor: cHex }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-900">
                      Size: <span className="font-normal text-stone-600">{selectedSize}</span>
                    </label>
                    <button
                      onClick={() => setActiveTab('sizing')}
                      className="text-[11px] text-amber-800 underline font-medium"
                    >
                      Size Guidance Chart
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedSize(s)}
                        className={`min-w-[48px] py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                          selectedSize === s
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white border-stone-300 text-stone-800 hover:border-stone-500'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="pt-2 flex items-center space-x-3">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-900">Quantity:</label>
                <div className="flex items-center border border-stone-300 rounded-lg bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-stone-600 hover:text-stone-900 text-sm font-semibold"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-bold text-stone-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                    className="px-3 py-1.5 text-stone-600 hover:text-stone-900 text-sm font-semibold disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-6 border-t border-stone-200 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isOutOfStock ? 'Sold Out' : 'Add to Bag'}</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40"
                >
                  <span>Instant Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    if (!isAuthenticated) onOpenAuth();
                    else toggleWishlist(product._id);
                  }}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    inWishlist ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-stone-300 text-stone-700 hover:border-stone-500'
                  }`}
                  title="Wishlist"
                >
                  <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Service guarantees */}
              <div className="grid grid-cols-2 gap-3 pt-3 text-[11px] text-stone-600 border-t border-stone-100">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  <span>Complimentary shipping over ₹15000</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  <span>30-Day doorstep exchange guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs (Description, Fabric, Care, Shipping, Size Guide) */}
        <div className="mt-12 bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 shadow-2xs">
          <div className="flex flex-wrap border-b border-stone-200 gap-4 sm:gap-8 pb-3">
            {[
              { id: 'desc', label: 'Tailoring & Details' },
              { id: 'material', label: 'Fabric & Care' },
              { id: 'shipping', label: 'White-Glove Shipping & Returns' },
              { id: 'sizing', label: 'Size Guide' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-xs font-bold uppercase tracking-wider pb-2 transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-stone-900 border-b-2 border-stone-900'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pt-6 text-xs sm:text-sm text-stone-700 leading-relaxed max-w-3xl">
            {activeTab === 'desc' && (
              <div className="space-y-3">
                <p>{product.description}</p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100 text-xs">
                  <div>
                    <strong className="text-stone-900">Origin Atelier:</strong> Northern Italy
                  </div>
                  <div>
                    <strong className="text-stone-900">Garment SKU:</strong> {product.sku}
                  </div>
                  <div>
                    <strong className="text-stone-900">Fit Silhouette:</strong> Modern Tailored Fit
                  </div>
                  <div>
                    <strong className="text-stone-900">Collection:</strong> {product.category}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'material' && (
              <div className="space-y-3">
                <p>
                  <strong>Composition:</strong> {product.material || '100% Grade-A Pure Natural Fibers'}.
                </p>
                <p>
                  Sustainably sourced from certified European mills committed to ethical craftsmanship and zero chemical degradation.
                </p>
                <div className="pt-2 text-xs text-stone-600">
                  <h5 className="font-bold text-stone-900 uppercase tracking-wider mb-1">Care Recommendations:</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Specialist gentle dry clean only.</li>
                    <li>Store on wide-shoulder contoured wooden hangers.</li>
                    <li>Do not tumble dry; steam gently on low temperature.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-3">
                <p>
                  Every garment is packaged in breathable dust bags within signature rigid LuxeAttire presentation boxes.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-stone-600">
                  <li><strong>Standard Delivery (2-4 business days):</strong> Complimentary on orders over $200 ($15 otherwise).</li>
                  <li><strong>Priority Overnight:</strong> $25 flat rate with tracking confirmation and signature required.</li>
                  <li><strong>30-Day Returns:</strong> Pre-paid return labels included with every dispatch.</li>
                </ul>
              </div>
            )}

            {activeTab === 'sizing' && (
              <div className="space-y-3">
                <p>Designed true to classic European sizing. If you find yourself between sizes, we recommend ordering one size up for a comfortable drape.</p>
                <table className="w-full text-left text-xs border border-stone-200 mt-2">
                  <thead className="bg-stone-50 font-bold border-b border-stone-200">
                    <tr>
                      <th className="p-2">Size</th>
                      <th className="p-2">Chest (Inches)</th>
                      <th className="p-2">Waist (Inches)</th>
                      <th className="p-2">Hips (Inches)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <tr><td className="p-2 font-bold">XS</td><td className="p-2">34-36</td><td className="p-2">28-30</td><td className="p-2">34-36</td></tr>
                    <tr><td className="p-2 font-bold">S</td><td className="p-2">36-38</td><td className="p-2">30-32</td><td className="p-2">36-38</td></tr>
                    <tr><td className="p-2 font-bold">M</td><td className="p-2">38-40</td><td className="p-2">32-34</td><td className="p-2">38-40</td></tr>
                    <tr><td className="p-2 font-bold">L</td><td className="p-2">40-42</td><td className="p-2">34-36</td><td className="p-2">40-42</td></tr>
                    <tr><td className="p-2 font-bold">XL</td><td className="p-2">42-44</td><td className="p-2">36-38</td><td className="p-2">42-44</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Customer Reviews Section */}
        <section id="reviews" className="mt-12 bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-10 shadow-2xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b border-stone-100">
            <div>
              <h3 className="font-serif text-2xl font-bold text-stone-900">Client Reviews</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Authentic opinions from verified patrons.
              </p>
            </div>

            <button
              onClick={() => {
                if (!isAuthenticated) onOpenAuth();
                else setShowReviewForm(!showReviewForm);
              }}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Write a Review</span>
            </button>
          </div>

          {reviewSuccessMsg && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{reviewSuccessMsg}</span>
            </div>
          )}

          {/* Review Submission Form Modal/Panel */}
          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="mb-8 p-6 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">Your Evaluation</h4>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Rating</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-amber-500 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-5 h-5 ${star <= reviewRating ? 'fill-current' : 'text-stone-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Headline (Optional)</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={e => setReviewTitle(e.target.value)}
                  placeholder="e.g. Exceptional tailoring and cloud-soft touch"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Your Detailed Feedback</label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Describe the fit, drape, texture, and how it pairs with your wardrobe..."
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-5 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 disabled:opacity-40"
                >
                  {reviewSubmitting ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-4 text-center">
              No client reviews yet. Be the first to review this atelier piece.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {reviews.map(r => (
                <div key={r._id} className="py-5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-current' : 'text-stone-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-stone-900">{r.userName}</span>
                      {r.verifiedPurchase && (
                        <span className="text-[10px] text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-50">
                          Verified Buyer
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.title && <h5 className="text-xs font-bold text-stone-900">{r.title}</h5>}
                  <p className="text-xs text-stone-600 leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-16">
            <h3 className="font-serif text-2xl font-bold text-stone-900 mb-6">Complete The Look</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map(rel => (
                <ProductCard key={rel._id} product={rel} onAuthRequired={onOpenAuth} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};