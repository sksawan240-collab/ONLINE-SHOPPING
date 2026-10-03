import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  User as UserIcon,
  Search,
  Menu,
  X,
  ChevronDown,
  Shield,
  Briefcase,
  LogOut,
  Package,
  Bell,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { api } from '../../services/api';
import { Product } from '../../types';

interface HeaderProps {
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth }) => {
  const { user, isAuthenticated, isAdmin, isSalesManager, logout } = useAuth();
  const { itemCount, setIsCartDrawerOpen } = useCart();
  const { productIds } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [announcement, setAnnouncement] = useState('Complimentary Worldwide Shipping on Orders Over $200 · Use Code LUXE15 for 15% Off');
  const [announcementActive, setAnnouncementActive] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch announcement setting
  useEffect(() => {
    api.admin.getSettings()
      .then(res => {
        if (res.success && res.settings?.announcementBar) {
          setAnnouncement(res.settings.announcementBar.text);
          setAnnouncementActive(res.settings.announcementBar.isActive);
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.products.list({ search: searchQuery, limit: 5 });
        if (res.success) {
          setSearchSuggestions(res.products || []);
        }
      } catch {
        setSearchSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Top Announcement Bar */}
      {announcementActive && announcement && (
        <div className="bg-stone-900 text-stone-200 text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2 border-b border-stone-800">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{announcement}</span>
        </div>
      )}

      {/* Main Sticky Header */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-stone-200/80 py-3'
            : 'bg-white border-b border-stone-100 py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-stone-700 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Brand Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex flex-col group">
                <span className="font-serif text-2xl sm:text-3xl font-bold tracking-widest text-stone-900 group-hover:text-amber-800 transition-colors">
                  NAVEOR
                </span>
                <span className="text-[9px] uppercase tracking-[0.25em] text-stone-500 font-medium">
                  WEAR YOUR STORY
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-7 text-sm font-medium tracking-wide text-stone-700">
              <Link
                to="/"
                className={`hover:text-stone-950 transition-colors pb-1 ${
                  location.pathname === '/' ? 'text-stone-950 border-b-2 border-stone-900' : ''
                }`}
              >
                Home
              </Link>
              <Link
                to="/products?gender=Women"
                className="hover:text-stone-950 transition-colors pb-1"
              >
                Women
              </Link>
              <Link
                to="/products?gender=Men"
                className="hover:text-stone-950 transition-colors pb-1"
              >
                Men
              </Link>
              <Link
                to="/products?gender=Kids"
                className="hover:text-stone-950 transition-colors pb-1"
              >
                Kids
              </Link>
              <Link
                to="/products?isNewArrival=true"
                className="hover:text-stone-950 transition-colors pb-1 text-amber-800"
              >
                New Arrivals
              </Link>
              <Link
                to="/products"
                className="hover:text-stone-950 transition-colors pb-1"
              >
                All Collections
              </Link>
              <Link
                to="/track-order"
                className="hover:text-stone-950 transition-colors pb-1 text-stone-500"
              >
                Track Order
              </Link>
            </nav>

            {/* Header Right Action Icons */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Search Toggle */}
              <button
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className="p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
                aria-label="Search Catalog"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Wishlist Icon */}
              <Link
                to={isAuthenticated ? '/account?tab=wishlist' : '#'}
                onClick={e => {
                  if (!isAuthenticated) {
                    e.preventDefault();
                    onOpenAuth();
                  }
                }}
                className="p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors relative"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {productIds.length > 0 && (
                  <span className="absolute top-1 right-1 bg-stone-900 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {productIds.length}
                  </span>
                )}
              </Link>

              {/* Cart Icon */}
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    onOpenAuth();
                  } else {
                    setIsCartDrawerOpen(true);
                  }
                }}
                className="p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors relative"
                aria-label="Shopping Bag"
              >
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 bg-amber-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* User Account Menu */}
              <div className="relative" ref={dropdownRef}>
                {isAuthenticated ? (
                  <div>
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-stone-100 border border-stone-200 transition-colors"
                      aria-label="User Account"
                    >
                      <div className="w-7 h-7 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-semibold uppercase">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-stone-500 hidden sm:block mr-1" />
                    </button>

                    {/* Account Dropdown */}
                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 animate-fade-in">
                        <div className="px-4 py-2 border-b border-stone-100">
                          <p className="text-xs text-stone-500">Signed in as</p>
                          <p className="text-sm font-semibold text-stone-900 truncate">{user?.name}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                              {user?.role?.replace('_', ' ')}
                            </span>
                            {user?.isVerified && (
                              <span className="text-[10px] text-emerald-600 font-medium">Verified</span>
                            )}
                          </div>
                        </div>

                        {/* Admin Link */}
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center space-x-2 px-4 py-2.5 text-sm text-amber-900 hover:bg-amber-50 font-medium transition-colors"
                          >
                            <Shield className="w-4 h-4 text-amber-700" />
                            <span>Admin Control Center</span>
                          </Link>
                        )}

                        {/* Sales Manager Link */}
                        {isSalesManager && (
                          <Link
                            to="/sales-manager"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center space-x-2 px-4 py-2.5 text-sm text-stone-800 hover:bg-stone-50 font-medium transition-colors"
                          >
                            <Briefcase className="w-4 h-4 text-stone-600" />
                            <span>Sales Manager Portal</span>
                          </Link>
                        )}

                        {/* Customer Dashboard Links */}
                        <Link
                          to="/account?tab=orders"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                        >
                          <Package className="w-4 h-4 text-stone-500" />
                          <span>My Orders & Returns</span>
                        </Link>

                        <Link
                          to="/account?tab=profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                        >
                          <UserIcon className="w-4 h-4 text-stone-500" />
                          <span>Account Settings</span>
                        </Link>

                        <Link
                          to="/account?tab=notifications"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                        >
                          <Bell className="w-4 h-4 text-stone-500" />
                          <span>Notifications</span>
                        </Link>

                        <div className="border-t border-stone-100 my-1"></div>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={onOpenAuth}
                    className="flex items-center space-x-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all shadow-sm"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Overlay / Bar */}
        {searchOpen && (
          <div className="border-t border-stone-200 bg-white/95 px-4 py-3 animate-fade-in shadow-md">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search cashmere coats, silk dresses, shirts, SKUs, colors..."
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>

              {/* Suggestions Popup */}
              {searchSuggestions.length > 0 && (
                <div className="mt-2 bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden divide-y divide-stone-100">
                  {searchSuggestions.map(product => (
                    <Link
                      key={product._id}
                      to={`/products/${product.slug || product._id}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center space-x-3 p-2.5 hover:bg-stone-50 transition-colors"
                    >
                      <img
                        src={product.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=150'}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-900 truncate">{product.name}</p>
                        <p className="text-[11px] text-stone-500">{product.brand} · {product.category}</p>
                      </div>
                      <span className="text-xs font-bold text-stone-900">
                        ${Number(product.salePrice || product.price).toFixed(2)}
                      </span>
                    </Link>
                  ))}
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full text-center py-2 text-xs font-medium text-amber-800 hover:bg-stone-50"
                  >
                    View all matching results for "{searchQuery}"
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-fade-in">
            <div className="space-y-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-stone-800 hover:bg-stone-100"
              >
                Home
              </Link>
              <Link
                to="/products?gender=Women"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-stone-800 hover:bg-stone-100"
              >
                Women's Collection
              </Link>
              <Link
                to="/products?gender=Men"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-stone-800 hover:bg-stone-100"
              >
                Men's Collection
              </Link>
              <Link
                to="/products?gender=Kids"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-stone-800 hover:bg-stone-100"
              >
                Kids' Collection
              </Link>
              <Link
                to="/products?isNewArrival=true"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-amber-800 hover:bg-stone-100"
              >
                New Arrivals
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-stone-800 hover:bg-stone-100"
              >
                Shop All Collections
              </Link>
              <Link
                to="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-stone-600 hover:bg-stone-100"
              >
                Track Your Order
              </Link>
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-stone-200">
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold text-amber-900 bg-amber-50"
                >
                  <Shield className="w-4 h-4 text-amber-700" />
                  <span>Admin Control Center</span>
                </Link>
              </div>
            )}
            {isSalesManager && (
              <div className="pt-2">
                <Link
                  to="/sales-manager"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold text-stone-800 bg-stone-100"
                >
                  <Briefcase className="w-4 h-4 text-stone-600" />
                  <span>Sales Manager Portal</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
};
