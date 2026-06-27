import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface CartItem {
  itineraryId: number;
  title: string;
  image: string;
  author: string;
  authorImage: string;
  duration: string;
  cities: number;
  places: number;
  price: number;
  addedAt: number; // timestamp
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itineraryId: number) => void;
  clearCart: () => void;
  isInCart: (itineraryId: number) => boolean;
  itemCount: number;
}

const STORAGE_KEY = 'wai-travel-cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((item: CartItem) => {
    setItems(prev => {
      if (prev.some(i => i.itineraryId === item.itineraryId)) return prev;
      return [...prev, { ...item, addedAt: Date.now() }];
    });
  }, []);

  const removeFromCart = useCallback((itineraryId: number) => {
    setItems(prev => prev.filter(i => i.itineraryId !== itineraryId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback((itineraryId: number) => items.some(i => i.itineraryId === itineraryId), [items]);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, isInCart, itemCount: items.length }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
