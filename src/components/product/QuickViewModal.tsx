import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Star, ShoppingBag, Heart, Check, ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAuthRequired: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, onClose, onAuthRequired }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  const [selectedSize, setSelectedSize] = useState<string>(product?.sizes?.[0] || 'M');
  const [selectedColor, setSelectedColor] = useState<string>(
    typeof product?.colors?.[0] === 'string' ? product.colors[0] : product?.colors?.[0]?.name || 'Default'
  );
  const [activeImage, setActiveImage] = useState<string>(product?.images?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!product) return null;

  const inWishlist = isInWishlist(product._id);
  const price = product.salePrice || product.price;
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    const success = await addToCart(product._id, selectedSize, selectedColor, quantity);
    if (success) {
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white text-stone-700 rounded-full shadow-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gallery Preview */}
        <div className="w-full md:w-1/2 bg-stone-100 p-4 flex flex-col items-center justify-center">
          <div className="w-full aspect-3/4 max-h-[380px] overflow-hidden rounded-xl bg-stone-200">
            <img
              src={activeImage || product.images?.[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto py-1 max-w-full">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`w-14 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    activeImage === img ? 'border-stone-900 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Actions */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center text-xs text-stone-500 mb-1 space-x-1">
              <span className="font-bold text-stone-800 uppercase tracking-wider">{product.brand}</span>
              <span>·</span>
              <span>{product.category}</span>
            </div>

            <h3 className="font-serif text-xl font-bold text-stone-900">{product.name}</h3>

            {/* Stars */}
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <div className="flex items-center text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="ml-1 font-bold text-stone-800">{product.rating.toFixed(1)}</span>
              </div>
              <span className="text-stone-400">({product.numReviews} client reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-2xl font-bold text-stone-900">₹{price.toFixed(2)}</span>
              {product.discount > 0 && (
                <>
                  <span className="text-sm text-stone-400 line-through">₹{product.price.toFixed(2)}</span>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Save {product.discount}%
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-stone-600 mt-3 line-clamp-3 leading-relaxed">
              {product.shortDescription || product.description}
            </p>

            {/* Color selection */}
            {product.colors && product.colors.length > 0 && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                  Color: <span className="font-normal text-stone-600">{selectedColor}</span>
                </label>
                <div className="flex gap-2">
                  {product.colors.map((c, i) => {
                    const cName = typeof c === 'string' ? c : c.name;
                    const cHex = typeof c === 'string' ? '#333' : c.hex;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedColor(cName)}
                        title={cName}
                        className={`w-7 h-7 rounded-full border-2 transition-all p-0.5 ${
                          selectedColor === cName ? 'border-stone-900 scale-110' : 'border-stone-200'
                        }`}
                      >
                        <span className="block w-full h-full rounded-full" style={{ backgroundColor: cHex }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                  Select Size: <span className="font-normal text-stone-600">{selectedSize}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        selectedSize === s
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-300 text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 pt-4 border-t border-stone-200 space-y-2.5">
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                {addedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Added to Bag!</span>
                  </>
                ) : isOutOfStock ? (
                  <span>Out of Stock</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Bag</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (!isAuthenticated) onAuthRequired();
                  else toggleWishlist(product._id);
                }}
                className={`p-3 rounded-xl border transition-colors ${
                  inWishlist
                    ? 'border-rose-300 bg-rose-50 text-rose-600'
                    : 'border-stone-300 hover:border-stone-400 text-stone-700'
                }`}
                title="Save to Wishlist"
              >
                <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
            </div>

            <Link
              to={`/products/${product.slug || product._id}`}
              onClick={onClose}
              className="w-full text-center text-xs text-stone-600 hover:text-stone-950 font-medium flex items-center justify-center gap-1 py-1"
            >
              <span>View Full Atelier Specifications & Reviews</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};