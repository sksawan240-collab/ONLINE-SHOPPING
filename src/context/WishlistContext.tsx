import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  productIds: string[];
  items: Product[];
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [productIds, setProductIds] = useState<string[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshWishlist = async () => {
    if (!isAuthenticated) {
      setProductIds([]);
      setItems([]);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.wishlist.get();
      if (res.success) {
        setItems(res.items || []);
        setProductIds(res.productIds || []);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshWishlist();
  }, [isAuthenticated]);

  const isInWishlist = (productId: string): boolean => {
    return productIds.includes(productId);
  };

  const toggleWishlist = async (productId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    try {
      const res = await api.wishlist.toggle(productId);
      if (res.success) {
        setProductIds(res.productIds || []);
        await refreshWishlist();
        return res.isInWishlist;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        productIds,
        items,
        isLoading,
        isInWishlist,
        toggleWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
