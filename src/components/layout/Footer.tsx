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
      {/* Service Value Pillars */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-stone-800">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-stone-900 rounded-xl text-amber-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">White-Glove Express</h4>
              <p className="text-xs text-stone-400 mt-1">Complimentary worldwide delivery on qualifying orders over $200.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-stone-900 rounded-xl text-amber-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Seamless 30-Day Returns</h4>
              <p className="text-xs text-stone-400 mt-1">Doorstep pickup and full refunds processed through our portal.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-stone-900 rounded-xl text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Authenticity Guaranteed</h4>
              <p className="text-xs text-stone-400 mt-1">Sourced directly from European ateliers with individual SKU provenance.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-stone-900 rounded-xl text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Private Atelier Care</h4>
              <p className="text-xs text-stone-400 mt-1">Bespoke sizing recommendations and styling consultations available.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand Info & Newsletter */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <span className="font-serif text-2xl font-bold tracking-widest text-white">NAVEOR</span>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-0.5">WEAR YOUR STORY</p>
            </Link>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              Crafting modern luxury with uncompromising standards. Discover architectural outerwear, pure mulberry silks, and sustainably sourced Mongolian cashmere.
            </p>

            {/* Newsletter form */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-white mb-2 uppercase tracking-wider">Join The Private Guestlist</p>
              <form onSubmit={handleSubscribe} className="flex max-w-md">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email for private previews"
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
                  <span>Thank you for subscribing to Naveor Wear your Story.</span>
                </div>
              )}
            </div>
          </div>

          {/* Collections */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Collections</h5>
            <ul className="space-y-2.5 text-xs">
                            <li>
                <Link to="/products?gender=Men" className="hover:text-white transition-colors">Men's Tailoring</Link>
              </li>
              <li>
                <Link to="/products?category=Outerwear%20%26%20Coats" className="hover:text-white transition-colors">Outerwear & Coats</Link>
              </li>
              <li>
                <Link to="/products?category=Knitwear%20%26%20Sweaters" className="hover:text-white transition-colors">Mongolian Cashmere</Link>
              </li>
              <li>
                <Link to="/products?category=Dresses%20%26%20Gowns" className="hover:text-white transition-colors">Evening Silks</Link>
              </li>
              <li>
                <Link to="/products?isNewArrival=true" className="hover:text-white transition-colors text-amber-400">New Arrivals 2026</Link>
              </li>
            </ul>
          </div>

          {/* Client Concierge */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Client Care</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/track-order" className="hover:text-white transition-colors">Track Your Order</Link>
              </li>
              <li>
                <Link to="/account?tab=orders" className="hover:text-white transition-colors">Returns & Exchanges</Link>
              </li>
              <li>
                <a href="#size-guide" className="hover:text-white transition-colors">Size & Fit Guidance</a>
              </li>
              <li>
                <a href="mailto:support@luxeattire.fashion" className="hover:text-white transition-colors">Atelier Concierge</a>
              </li>
              <li>
                <Link to="/account" className="hover:text-white transition-colors">Account Portal</Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">The Atelier</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <span className="text-stone-400">540 Madison Ave, New York, NY</span>
              </li>
              <li>
                <span className="text-stone-400">Via Montenapoleone 8, Milan</span>
              </li>
              <li>
                <span className="text-stone-400">naveorindia@gmail.com</span>
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

        {/* Bottom Bar */}
        <div className="border-t border-stone-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© 2026 NAVEOR WEAR YOUR STORY Inc. All rights reserved. Registered Trademark.</p>
          <div className="flex items-center space-x-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Cookie Preferences</span>
            <span>Security & GDPR</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
