import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  RotateCcw,
  Truck,
  TrendingUp,
  Tag,
  Star,
  Copy,
  Check,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { Product, Category, StoreSettings } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { QuickViewModal } from '../components/product/QuickViewModal';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  onOpenAuth: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenAuth }) => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'new' | 'best' | 'featured'>('new');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    async function loadHomeData() {
      try {
        setLoading(true);
        const [settingsRes, catRes, prodRes] = await Promise.all([
          api.admin.getSettings().catch(() => ({ success: false, settings: null })),
          api.categories.list().catch(() => ({ success: false, categories: [] })),
          api.products.list({ limit: 16 }).catch(() => ({ success: false, products: [] })),
        ]);

        if (settingsRes.success && settingsRes.settings) {
          setSettings(settingsRes.settings);
        }
        if (catRes.success) {
          setCategories(catRes.categories || []);
        }
        if (prodRes.success && prodRes.products) {
          const prods = prodRes.products;
          setNewArrivals(prods.filter(p => p.isNewArrival).slice(0, 8));
          setBestSellers(prods.filter(p => p.isBestSeller).slice(0, 8));
          setFeaturedProducts(prods.filter(p => p.isFeatured).slice(0, 8));
        }
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  const handleSeedCatalog = async () => {
    try {
      setSeeding(true);
      const res = await api.admin.seedCatalog(true);
      if (res.success) {
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message || 'Seeding failed. Make sure you are signed in as Admin.');
    } finally {
      setSeeding(false);
    }
  };

  const hero = settings?.hero || {
    title: 'DEFINE YOUR STYLE.',
    subtitle: 'Discover modern essentials, timeless classics, and the latest trends in men’s fashion.',
    ctaText: 'SHOP NEW ARRIVALS',
    ctaLink: '/products?isNewArrival=true',
    secondaryCtaText: 'EXPLORE COLLECTION',
    secondaryCtaLink: '/products?category=T-Shirts',
    bannerImage: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1600&auto=format&fit=crop',
    badge: 'PREMIUM MEN’S ESSENTIALS',
  };

  const currentTabProducts =
    activeTab === 'new'
      ? (newArrivals.length > 0 ? newArrivals : featuredProducts)
      : activeTab === 'best'
      ? (bestSellers.length > 0 ? bestSellers : featuredProducts)
      : featuredProducts;

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <section className="relative overflow-hidden bg-stone-900 text-white min-h-[580px] lg:min-h-[680px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            src={hero.bannerImage}
            alt="Premium men’s fashion"
            className="w-full h-full object-cover object-top opacity-55 scale-105 animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/70 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-widest text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{hero.badge || 'Premium Men’s Essentials'}</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
              {hero.title}
            </h1>

            <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-xl">
              {hero.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-3">
              <Link
                to={hero.ctaLink || '/products?isNewArrival=true'}
                className="px-7 py-3.5 bg-white hover:bg-stone-100 text-stone-950 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xl hover:shadow-2xl flex items-center gap-2 group"
              >
                <span>{hero.ctaText || 'Shop New Arrivals'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to={hero.secondaryCtaLink || '/products?category=T-Shirts'}
                className="px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-md transition-all"
              >
                {hero.secondaryCtaText || 'Explore Collection'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-stone-200/80 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">Fast Delivery</p>
                <p className="text-[11px] text-stone-500">Across India and worldwide</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">Premium Quality</p>
                <p className="text-[11px] text-stone-500">Crafted for everyday confidence</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">Easy Returns</p>
                <p className="text-[11px] text-stone-500">30-day hassle-free exchanges</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">Styling Essentials</p>
                <p className="text-[11px] text-stone-500">Built for modern wardrobes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-800 font-bold mb-1">Wardrobe Curation</p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">Shop by Category</h2>
            </div>
            <Link to="/products" className="text-xs font-semibold text-stone-700 hover:text-stone-950 flex items-center gap-1 group">
              <span>View All Collections</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.slice(0, 8).map(cat => (
              <Link
                key={cat._id}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                className="group relative rounded-xl overflow-hidden aspect-4/5 bg-stone-100 flex flex-col justify-end p-4 border border-stone-200 shadow-sm hover:shadow-md transition-all"
              >
                <img
                  src={cat.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=400&auto=format&fit=crop'}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="relative z-10 text-white">
                  <h3 className="font-serif text-base font-bold leading-tight group-hover:text-amber-300 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-stone-300 mt-0.5">
                    {cat.productCount ? `${cat.productCount} styles` : 'Explore styles'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-stone-200 pb-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">Trending Men’s Fashion</h2>
            <p className="text-xs text-stone-500 mt-1">Fresh essentials, elevated tailoring, and everyday statement staples.</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'new' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              New Arrivals
            </button>
            <button
              onClick={() => setActiveTab('best')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'best' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Best Sellers
            </button>
            <button
              onClick={() => setActiveTab('featured')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'featured' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Featured
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="rounded-xl bg-stone-200 animate-pulse aspect-3/4" />
            ))}
          </div>
        ) : currentTabProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {currentTabProducts.map(product => (
              <ProductCard
                key={product._id}
                product={product}
                onQuickView={prod => setQuickViewProduct(prod)}
                onAuthRequired={onOpenAuth}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-stone-200 shadow-sm max-w-xl mx-auto my-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-900">No men’s products have been added yet</h3>
            <p className="text-xs text-stone-500 mt-2 max-w-md mx-auto leading-relaxed">
              Your database is ready. You can add products from the Admin Dashboard or seed a men’s collection for the storefront.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={handleSeedCatalog}
                disabled={seeding}
                className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50"
              >
                {seeding ? 'Initializing Catalog...' : 'Seed Men’s Catalog'}
              </button>

              <Link
                to="/admin"
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold tracking-wide transition-colors"
              >
                Go to Admin Panel
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-950 via-stone-900 to-stone-950 text-white p-8 md:p-12 shadow-xl border border-amber-900/40">
          <div className="relative z-10 max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Tag className="w-4 h-4" />
              <span>Exclusive Offer</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">Refresh your essentials with premium pieces.</h2>
            <p className="text-stone-300 text-xs sm:text-sm">
              Enjoy limited-time savings on curated essentials, layered classics, and modern wardrobe staples.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText('LUXE15');
                  setCopiedCoupon(true);
                  setTimeout(() => setCopiedCoupon(false), 3000);
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold rounded-lg border border-white/20 flex items-center gap-2 transition-colors"
              >
                {copiedCoupon ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCoupon ? 'Copied to Clipboard' : 'Copy Code: LUXE15'}</span>
              </button>

              <Link
                to="/products"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/products?category=T-Shirts"
            className="group relative rounded-2xl overflow-hidden aspect-4/5 bg-stone-100 flex flex-col justify-end p-6 border border-stone-200 shadow-sm"
          >
            <img
              src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop"
              alt="Mens T-Shirts"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
            <div className="relative z-10 text-white">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">Essential Layering</span>
              <h3 className="font-serif text-2xl font-bold mt-1">Everyday Basics</h3>
              <p className="text-xs text-stone-300 mt-1">Comfort-first silhouettes built for daily wear.</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold mt-3 text-white group-hover:underline">
                <span>Shop T-Shirts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/products?category=Jackets"
            className="group relative rounded-2xl overflow-hidden aspect-4/5 bg-stone-100 flex flex-col justify-end p-6 border border-stone-200 shadow-sm"
          >
            <img
              src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop"
              alt="Mens jackets"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
            <div className="relative z-10 text-white">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">Tailored Finish</span>
              <h3 className="font-serif text-2xl font-bold mt-1">Outerwear Edit</h3>
              <p className="text-xs text-stone-300 mt-1">Structured layers for smart casual and formal moments.</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold mt-3 text-white group-hover:underline">
                <span>Shop Jackets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/products?category=Jeans"
            className="group relative rounded-2xl overflow-hidden aspect-4/5 bg-stone-100 flex flex-col justify-end p-6 border border-stone-200 shadow-sm"
          >
            <img
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop"
              alt="Mens denim"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
            <div className="relative z-10 text-white">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">Street Essentials</span>
              <h3 className="font-serif text-2xl font-bold mt-1">Modern Denim</h3>
              <p className="text-xs text-stone-300 mt-1">Clean cuts and premium fabrics built to move with you.</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold mt-3 text-white group-hover:underline">
                <span>Shop Denim</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAuthRequired={onOpenAuth}
      />
    </div>
  );
};

