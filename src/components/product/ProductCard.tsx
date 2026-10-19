import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';
import { Product } from '../../types';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  onAuthRequired?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView, onAuthRequired }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [addingToCart, setAddingToCart] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const inWishlist = isInWishlist(product._id);
  const price = product.salePrice || product.price;
  const hasDiscount = product.discount > 0 && product.discount < 100;
  const isOutOfStock = product.stock <= 0;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }
    toggleWishlist(product._id);
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }
    if (isOutOfStock) return;

    setAddingToCart(true);
    const defaultSize = product.sizes?.[0] || 'M';
    const defaultColor = product.colors?.[0]?.name || 'Default';
    await addToCart(product._id, defaultSize, defaultColor, 1);
    setAddingToCart(false);
  };

  const imageSrc =
    product.images?.[activeImageIdx] ||
    product.images?.[0] ||
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=600&auto=format&fit=crop';

  return (
    <div className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-stone-200/70 hover:border-stone-400 hover:shadow-lg transition-all duration-300">
      {/* Image container */}
      <Link
        to={`/products/${product.slug || product._id}`}
        className="relative aspect-3/4 overflow-hidden bg-stone-100 block"
        onMouseEnter={() => product.images?.length > 1 && setActiveImageIdx(1)}
        onMouseLeave={() => setActiveImageIdx(0)}
      >
        <img
          src={imageSrc}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Status flags: Clean typographic tags per frontend-design */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
          {hasDiscount && (
            <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
              -{product.discount}%
            </span>
          )}
          {product.isNewArrival && (
            <span className="bg-stone-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm">
              New Season
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-stone-600 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm">
              Sold Out
            </span>
          )}
        </div>

        {/* Wishlist toggle button */}
        <button
          onClick={handleWishlistClick}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full shadow-md transition-all ${
            inWishlist
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
              : 'bg-white/90 text-stone-700 hover:bg-white hover:text-stone-950'
          }`}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        {/* Hover Quick Actions Drawer */}
        <div className="absolute inset-x-2 bottom-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onQuickView && (
            <button
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              className="flex-1 py-2 bg-white/95 backdrop-blur-xs text-stone-900 text-xs font-semibold rounded-lg shadow-sm hover:bg-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Quick View</span>
            </button>
          )}

          <button
            onClick={handleQuickAdd}
            disabled={isOutOfStock || addingToCart}
            className="flex-1 py-2 bg-stone-900/95 backdrop-blur-xs text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-stone-900 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isOutOfStock ? 'Sold Out' : addingToCart ? 'Adding...' : 'Add to Bag'}</span>
          </button>
        </div>
      </Link>

      {/* Product Content info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          {/* Metadata clean separators */}
          <div className="flex items-center text-[11px] text-stone-500 mb-1">
            <span className="font-semibold text-stone-800 uppercase tracking-wider">{product.brand}</span>
            <span className="mx-1.5 text-stone-300">·</span>
            <span>{product.category}</span>
          </div>

          <Link
            to={`/products/${product.slug || product._id}`}
            className="block text-sm font-medium text-stone-900 hover:text-amber-800 transition-colors line-clamp-1"
          >
            {product.name}
          </Link>

          {/* Star Rating */}
          <div className="flex items-center mt-1 text-xs">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="ml-1 text-[11px] font-bold text-stone-700">
                {product.rating > 0 ? product.rating.toFixed(1) : '5.0'}
              </span>
            </div>
            {product.numReviews > 0 && (
              <span className="text-[11px] text-stone-400 ml-1">({product.numReviews})</span>
            )}
          </div>
        </div>

        {/* Color swatches preview & Price */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
          <div className="flex items-center space-x-1">
            {product.colors?.slice(0, 4).map((c, i) => (
              <span
                key={i}
                title={typeof c === 'string' ? c : c.name}
                className="w-2.5 h-2.5 rounded-full border border-stone-300 shadow-2xs"
                style={{ backgroundColor: typeof c === 'string' ? '#333' : c.hex }}
              />
            ))}
            {product.colors && product.colors.length > 4 && (
              <span className="text-[9px] text-stone-400 font-medium">+{product.colors.length - 4}</span>
            )}
          </div>

          <div className="flex items-baseline space-x-1.5">
            <span className="text-sm font-bold text-stone-900">₹{Number(price).toFixed(2)}</span>
            {hasDiscount && (
              <span className="text-xs text-stone-400 line-through">
                ₹{Number(product.price).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};