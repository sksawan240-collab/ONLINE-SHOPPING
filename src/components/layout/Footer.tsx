import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Instagram,
  Facebook,
  Twitter,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  return (
    <footer className="bg-stone-950 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-stone-800">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-stone-900 rounded-xl text-amber-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Fast Dispatch</h4>
              <p className="text-xs text-stone-400 mt-1">Priority delivery on premium men’s essentials and everyday staples.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-stone-900 rounded-xl text-amber-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Easy Exchanges</h4>
              <p className="text-xs text-stone-400 mt-1">Simple 30-day returns and size support for better fit confidence.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-stone-900 rounded-xl text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Authenticity Promise</h4>
              <p className="text-xs text-stone-400 mt-1">Verified products, quality materials, and trusted brand sourcing.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-stone-900 rounded-xl text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Styling Guidance</h4>
              <p className="text-xs text-stone-400 mt-1">Curated essential pieces for modern, polished wardrobes.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <span className="font-serif text-2xl font-bold tracking-widest text-white">NAVEOR</span>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-0.5">MENS FASHION</p>
            </Link>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              Premium men’s essentials for elevated everyday style — from tailored layers to denim, streetwear, and refined accessories.
            </p>

            <div className="pt-2">
              <p className="text-xs font-semibold text-white mb-2 uppercase tracking-wider">Join the style list</p>
              <form onSubmit={handleSubscribe} className="flex max-w-md">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email for new arrivals"
                  required
                  className="bg-stone-900 border border-stone-800 text-white placeholder-stone-500 text-xs px-4 py-2.5 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1"
                />
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-r-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Join</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
              {subscribed && (
                <div className="mt-2 flex items-center space-x-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Thanks for joining the Naveor men’s updates.</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Collections</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/products?category=T-Shirts" className="hover:text-white transition-colors">T-Shirts</Link>
              </li>
              <li>
                <Link to="/products?category=Jackets" className="hover:text-white transition-colors">Jackets</Link>
              </li>
              <li>
                <Link to="/products?category=Jeans" className="hover:text-white transition-colors">Jeans</Link>
              </li>
              <li>
                <Link to="/products?category=Sneakers" className="hover:text-white transition-colors">Sneakers</Link>
              </li>
              <li>
                <Link to="/products?isNewArrival=true" className="hover:text-white transition-colors text-amber-400">New Arrivals</Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Customer Care</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/track-order" className="hover:text-white transition-colors">Track Order</Link>
              </li>
              <li>
                <Link to="/account?tab=orders" className="hover:text-white transition-colors">Returns & Exchanges</Link>
              </li>
              <li>
                <a href="#size-guide" className="hover:text-white transition-colors">Size & Fit Guide</a>
              </li>
              <li>
                <a href="mailto:support@naveor.fashion" className="hover:text-white transition-colors">Style Concierge</a>
              </li>
              <li>
                <Link to="/account" className="hover:text-white transition-colors">Account Portal</Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">The Store</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <span className="text-stone-400">BANGALORE</span>
              </li>
              <li>
                <span className="text-stone-400">INDIA</span>
              </li>
              <li>
                <span className="text-stone-400">hello@naveor.fashion</span>
              </li>
              <li className="pt-2">
                <div className="flex items-center space-x-3 text-stone-400">
                  <a href="#instagram" className="hover:text-white transition-colors"><Instagram className="w-4 h-4" /></a>
                  <a href="#facebook" className="hover:text-white transition-colors"><Facebook className="w-4 h-4" /></a>
                  <a href="#twitter" className="hover:text-white transition-colors"><Twitter className="w-4 h-4" /></a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© 2026 NAVEOR. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Cookie Preferences</span>
            <span>Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

