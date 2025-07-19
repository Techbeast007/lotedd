import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  addToCart,
  CartItem,
  clearCart,
  getCart,
  getCartItemCount,
  getCartTotal,
  removeFromCart,
  updateCartItemQuantity
} from '../cartService';
import { Product } from '../productService';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearItems: () => Promise<void>;
  totalPrice: number;
  itemCount: number;
  isLoading: boolean;
  shippingCost: number;
  setShippingCost: (cost: number) => void;
  selectedCourier: { id: number; name: string } | null;
  setSelectedCourier: (courier: { id: number; name: string } | null) => void;
  shippingAddress?: {
    pincode: string;
    [key: string]: any;
  };
  updateShippingAddress: (address: any) => void;
}

// Create the context with default values
const CartContext = createContext<CartContextType>({
  items: [],
  addItem: async () => {},
  removeItem: async () => {},
  updateQuantity: async () => {},
  clearItems: async () => {},
  totalPrice: 0,
  itemCount: 0,
  isLoading: true,
  shippingCost: 0,
  setShippingCost: () => {},
  selectedCourier: null,
  setSelectedCourier: () => {},
  updateShippingAddress: () => {},
});

// Custom hook to use the cart context
export const useCart = () => useContext(CartContext);

// Provider component that wraps the app
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [itemCount, setItemCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [selectedCourier, setSelectedCourier] = useState<{ id: number; name: string } | null>(null);
  const [shippingAddress, setShippingAddress] = useState<any>(null);

  // Load cart data on component mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        setIsLoading(true);
        const cartItems = await getCart();
        const total = await getCartTotal();
        const count = await getCartItemCount();
        
        setItems(cartItems);
        setTotalPrice(total);
        setItemCount(count);
      } catch (error) {
        console.error('Error loading cart:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, []);

  // Update cart totals whenever items change
  const updateCartTotals = async () => {
    const total = await getCartTotal();
    const count = await getCartItemCount();
    setTotalPrice(total);
    setItemCount(count);
  };

  // Add an item to the cart
  const addItem = async (product: Product, quantity: number = 1) => {
    try {
      setIsLoading(true);
      const updatedCart = await addToCart(product, quantity);
      setItems(updatedCart);
      await updateCartTotals();
    } catch (error) {
      console.error('Error adding item to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove an item from the cart
  const removeItem = async (productId: string) => {
    try {
      setIsLoading(true);
      const updatedCart = await removeFromCart(productId);
      setItems(updatedCart);
      await updateCartTotals();
    } catch (error) {
      console.error('Error removing item from cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      setIsLoading(true);
      const updatedCart = await updateCartItemQuantity(productId, quantity);
      setItems(updatedCart);
      await updateCartTotals();
    } catch (error) {
      console.error('Error updating item quantity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear the cart
  const clearItems = async () => {
    try {
      setIsLoading(true);
      await clearCart();
      setItems([]);
      setTotalPrice(0);
      setItemCount(0);
      setShippingCost(0);
      setSelectedCourier(null);
    } catch (error) {
      console.error('Error clearing cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update shipping address
  const updateShippingAddress = (address: any) => {
    setShippingAddress(address);
  };

  // Context value
  const contextValue: CartContextType = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearItems,
    totalPrice,
    itemCount,
    isLoading,
    shippingCost,
    setShippingCost,
    selectedCourier,
    setSelectedCourier,
    shippingAddress,
    updateShippingAddress,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};