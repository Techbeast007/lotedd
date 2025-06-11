import { Product } from './productService';

export interface CartItem {
  product: Product;
  quantity: number;
}

// In-memory cart storage (will be replaced with AsyncStorage or Firebase in a real app)
let cart: CartItem[] = [];

/**
 * Add a product to the cart
 * @param product Product to add
 * @param quantity Quantity to add (default: 1)
 * @returns Updated cart
 */
export const addToCart = (product: Product, quantity: number = 1): CartItem[] => {
  // Check if product already exists in cart
  const existingItemIndex = cart.findIndex(item => item.product.id === product.id);
  
  if (existingItemIndex >= 0) {
    // Update quantity if product already exists
    cart[existingItemIndex].quantity += quantity;
  } else {
    // Add new item if product doesn't exist in cart
    cart.push({ product, quantity });
  }
  
  // Return a copy of the updated cart
  return [...cart];
};

/**
 * Remove a product from the cart
 * @param productId ID of the product to remove
 * @returns Updated cart
 */
export const removeFromCart = (productId: string): CartItem[] => {
  cart = cart.filter(item => item.product.id !== productId);
  return [...cart];
};

/**
 * Update the quantity of a product in the cart
 * @param productId ID of the product to update
 * @param quantity New quantity
 * @returns Updated cart
 */
export const updateCartItemQuantity = (productId: string, quantity: number): CartItem[] => {
  const existingItemIndex = cart.findIndex(item => item.product.id === productId);
  
  if (existingItemIndex >= 0) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      return removeFromCart(productId);
    } else {
      // Update quantity
      cart[existingItemIndex].quantity = quantity;
    }
  }
  
  return [...cart];
};

/**
 * Get the current cart
 * @returns Current cart
 */
export const getCart = (): CartItem[] => {
  return [...cart];
};

/**
 * Get the total number of items in the cart
 * @returns Total number of items
 */
export const getCartItemCount = (): number => {
  return cart.reduce((total, item) => total + item.quantity, 0);
};

/**
 * Get the total price of the cart
 * @returns Total price
 */
export const getCartTotal = (): number => {
  return cart.reduce((total, item) => {
    const price = item.product.discountPrice || item.product.basePrice;
    return total + price * item.quantity;
  }, 0);
};

/**
 * Clear the cart
 * @returns Empty cart
 */
export const clearCart = (): CartItem[] => {
  cart = [];
  return [...cart];
}