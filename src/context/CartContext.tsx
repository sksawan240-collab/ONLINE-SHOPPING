import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  isLoading: boolean;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  addToCart: (productId: string, size?: string, color?: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [itemCount, setItemCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

  const refreshCart = async () => {
    if (!isAuthenticated) {
      setItems([]);
      setSubtotal(0);
      setItemCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.cart.get();
      if (res.success && res.cart) {
        setItems(res.cart.items || []);
        setSubtotal(res.cart.subtotal || 0);
        setItemCount(res.cart.itemCount || 0);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [isAuthenticated]);

  const addToCart = async (productId: string, size = 'M', color = 'Default', quantity = 1) => {
    if (!isAuthenticated) {
      return false;
    }
    try {
      const res = await api.cart.addItem({ productId, size, color, quantity });
      if (res.success) {
        await refreshCart();
        setIsCartDrawerOpen(true);
        return true;
      }
      return false;
    } catch (err: any) {
      alert(err.message || 'Could not add to cart');
      return false;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await api.cart.updateItem(itemId, quantity);
      if (res.success) {
        await refreshCart();
        return true;
      }
      return false;
    } catch (err: any) {
      alert(err.message || 'Could not update quantity');
      return false;
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await api.cart.removeItem(itemId);
      if (res.success) {
        await refreshCart();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const clearCart = async () => {
    try {
      await api.cart.clear();
      setItems([]);
      setSubtotal(0);
      setItemCount(0);
    } catch {
      // Ignored
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        itemCount,
        isLoading,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
