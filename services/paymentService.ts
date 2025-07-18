import firestore from '@react-native-firebase/firestore';
import { getCurrentUser } from './authService';
import { BidOffer } from './biddingService';
import { CartItem, clearCart } from './cartService';
import { Product } from './productService';

// Define payment types
export type PaymentStatus = 'pending' | 'partial' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'razorpay' | 'cod' | 'other';

// Payment interface
export interface Payment {
  id?: string;
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Order interface
export interface Order {
  id?: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'processing' | 'in-transit' | 'delivered' | 'cancelled';
  paymentStatus: PaymentStatus;
  shippingAddress?: any;
  createdAt?: any;
  updatedAt?: any;
  isBidOrder?: boolean;
  bidId?: string;
  bidOfferId?: string;
  estimatedDelivery?: any;
  trackingId?: string;
}

// Razorpay API key (should be stored in environment variables in production)
const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_HERE'; // Replace with your actual test key

/**
 * Create a new order in Firestore
 * @param items Items in the order
 * @param totalAmount Total order amount
 * @param isBidOrder Whether this is from a bid or regular cart
 * @param bidId Optional bid ID if this is a bid order
 * @param bidOfferId Optional bid offer ID if this is a bid order
 * @returns The created order
 */
export const createOrder = async (
  items: CartItem[],
  totalAmount: number,
  isBidOrder: boolean = false,
  bidId?: string, 
  bidOfferId?: string,
  shippingAddress?: any
): Promise<Order> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to create an order');
    }

    // Clean the shipping address object to remove any undefined values
    // Firestore doesn't support undefined values
    const cleanAddress = shippingAddress ? Object.fromEntries(
      Object.entries(shippingAddress).filter(([_, value]) => value !== undefined)
    ) : null;

    // Create a new order in Firestore
    const orderData: Omit<Order, 'id'> = {
      userId: user.uid,
      items,
      totalAmount,
      paidAmount: 0, // Initially 0, will be updated after payment
      remainingAmount: totalAmount, // Initially full amount
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      isBidOrder,
    };

    // Only add fields that are not undefined
    if (cleanAddress) orderData.shippingAddress = cleanAddress;
    if (bidId) orderData.bidId = bidId;
    if (bidOfferId) orderData.bidOfferId = bidOfferId;

    const orderRef = await firestore().collection('orders').add(orderData);
    
    return {
      id: orderRef.id,
      ...orderData
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Initialize Razorpay payment for 50% of the order amount
 * @param order Order to process payment for
 * @returns Razorpay payment options
 */
export const initializeRazorpayPayment = async (order: Order) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to process payment');
    }
    
    // Calculate 50% of the total amount (this is the initial payment)
    const paymentAmount = Math.ceil(order.totalAmount * 0.5); 
    
    // Create options for Razorpay
    const options = {
      description: `Payment for order ${order.id}`,
      image: 'https://your-app-logo-url.png', // Replace with your app logo
      currency: 'INR',
      key: RAZORPAY_KEY_ID,
      amount: paymentAmount * 100, // Razorpay expects amount in paise
      name: 'Lotedd',
      order_id: order.id, // This is different from Razorpay's order ID
      prefill: {
        email: user.email || '',
        contact: user.phoneNumber || '',
        name: user.displayName || '',
      },
      theme: { color: '#3B82F6' }
    };
    
    return options;
  } catch (error) {
    console.error('Error initializing Razorpay payment:', error);
    throw error;
  }
};

/**
 * Handle successful Razorpay payment
 * @param orderId Order ID
 * @param paymentData Payment data from Razorpay
 * @returns Updated order
 */
export const handleRazorpaySuccess = async (
  orderId: string,
  paymentData: { 
    razorpay_payment_id: string; 
    razorpay_order_id: string; 
    razorpay_signature: string;
  }
) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to process payment');
    }

    // Get the order
    const orderRef = firestore().collection('orders').doc(orderId);
    const orderSnapshot = await orderRef.get();
    
    if (!orderSnapshot.exists) {
      throw new Error('Order not found');
    }
    
    const orderData = orderSnapshot.data() as Order;
    
    // Calculate payment amount (50% of total)
    const paymentAmount = Math.ceil(orderData.totalAmount * 0.5);
    
    // Create a payment record
    const paymentData: Omit<Payment, 'id'> = {
      userId: user.uid,
      orderId,
      amount: paymentAmount,
      currency: 'INR',
      status: 'completed',
      method: 'razorpay',
      razorpayPaymentId: paymentData.razorpay_payment_id,
      razorpayOrderId: paymentData.razorpay_order_id,
      razorpaySignature: paymentData.razorpay_signature,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };
    
    const paymentRef = await firestore().collection('payments').add(paymentData);
    
    // Update order with payment info
    await orderRef.update({
      paidAmount: paymentAmount,
      remainingAmount: orderData.totalAmount - paymentAmount,
      paymentStatus: 'partial',
      status: 'processing', // Move order to processing status
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    // If this is a bid order, update the bid offer status
    if (orderData.isBidOrder && orderData.bidId && orderData.bidOfferId) {
      await firestore().collection('bidOffers').doc(orderData.bidOfferId).update({
        status: 'accepted',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }
    
    // Clear the cart if this is a regular order
    if (!orderData.isBidOrder) {
      await clearCart();
    }

    return {
      success: true,
      orderId,
      paymentId: paymentRef.id
    };
  } catch (error) {
    console.error('Error handling Razorpay success:', error);
    throw error;
  }
};

/**
 * Handle failed Razorpay payment
 * @param orderId Order ID
 * @param error Error from Razorpay
 */
export const handleRazorpayFailure = async (orderId: string, error: any) => {
  try {
    // Get the order
    const orderRef = firestore().collection('orders').doc(orderId);
    const orderSnapshot = await orderRef.get();
    
    if (!orderSnapshot.exists) {
      throw new Error('Order not found');
    }
    
    // Update order with failed status
    await orderRef.update({
      paymentStatus: 'failed',
      status: 'cancelled',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: false,
      orderId,
      error: error.description || 'Payment failed'
    };
  } catch (err) {
    console.error('Error handling Razorpay failure:', err);
    throw err;
  }
};

/**
 * Process bid payment through Razorpay (50% upfront)
 * @param bidOffer The bid offer to process payment for
 * @returns Order details
 */
export const processBidPayment = async (bidOffer: BidOffer) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to process payment');
    }
    
    // Calculate total amount
    const totalAmount = bidOffer.bidAmount * bidOffer.quantity;
    
    // Create a cart-like item from the bid
    const bidProductRef = await firestore().collection('products').doc(bidOffer.productId).get();
    
    if (!bidProductRef.exists) {
      throw new Error('Product not found');
    }
    
    const productData = bidProductRef.data() as Product;
    
    // Create cart-like item
    const bidCartItem: CartItem = {
      product: {
        ...productData,
        id: bidOffer.productId
      },
      quantity: bidOffer.quantity
    };
    
    // Create order for the bid
    const order = await createOrder(
      [bidCartItem],
      totalAmount,
      true, // This is a bid order
      bidOffer.bidId,
      bidOffer.id
    );
    
    return order;
  } catch (error) {
    console.error('Error processing bid payment:', error);
    throw error;
  }
};

/**
 * Get orders for the current user
 * @returns List of orders
 */
export const getUserOrders = async () => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to view orders');
    }
    
    const ordersSnapshot = await firestore()
      .collection('orders')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
    
    return orders;
  } catch (error) {
    console.error('Error getting user orders:', error);
    throw error;
  }
};

/**
 * Process the second payment (remaining 50%) for an order
 * @param orderId Order ID to process the remaining payment for
 */
export const processRemainingPayment = async (orderId: string) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to process payment');
    }
    
    const orderRef = firestore().collection('orders').doc(orderId);
    const orderSnapshot = await orderRef.get();
    
    if (!orderSnapshot.exists) {
      throw new Error('Order not found');
    }
    
    const orderData = orderSnapshot.data() as Order;
    
    // Validate that this is a partial payment order
    if (orderData.paymentStatus !== 'partial') {
      throw new Error('This order is not eligible for remaining payment');
    }
    
    // Create options for Razorpay
    const options = {
      description: `Remaining payment for order ${orderId}`,
      image: 'https://your-app-logo-url.png', // Replace with your app logo
      currency: 'INR',
      key: RAZORPAY_KEY_ID,
      amount: orderData.remainingAmount * 100, // Razorpay expects amount in paise
      name: 'Lotedd',
      order_id: `${orderId}-remaining`, // This is different from Razorpay's order ID
      prefill: {
        email: user.email || '',
        contact: user.phoneNumber || '',
        name: user.displayName || '',
      },
      theme: { color: '#3B82F6' }
    };
    
    return options;
  } catch (error) {
    console.error('Error processing remaining payment:', error);
    throw error;
  }
};

/**
 * Handle successful Razorpay payment for the remaining amount
 * @param orderId Order ID
 * @param paymentData Payment data from Razorpay
 */
export const handleRemainingPaymentSuccess = async (
  orderId: string,
  paymentData: { 
    razorpay_payment_id: string; 
    razorpay_order_id: string; 
    razorpay_signature: string;
  }
) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to process payment');
    }

    // Get the order
    const orderRef = firestore().collection('orders').doc(orderId);
    const orderSnapshot = await orderRef.get();
    
    if (!orderSnapshot.exists) {
      throw new Error('Order not found');
    }
    
    const orderData = orderSnapshot.data() as Order;
    
    // Create a payment record for the remaining amount
    const paymentData2: Omit<Payment, 'id'> = {
      userId: user.uid,
      orderId,
      amount: orderData.remainingAmount,
      currency: 'INR',
      status: 'completed',
      method: 'razorpay',
      razorpayPaymentId: paymentData.razorpay_payment_id,
      razorpayOrderId: paymentData.razorpay_order_id,
      razorpaySignature: paymentData.razorpay_signature,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };
    
    const paymentRef = await firestore().collection('payments').add(paymentData2);
    
    // Update order to completed status
    await orderRef.update({
      paidAmount: orderData.totalAmount,
      remainingAmount: 0,
      paymentStatus: 'completed',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      orderId,
      paymentId: paymentRef.id
    };
  } catch (error) {
    console.error('Error handling remaining payment success:', error);
    throw error;
  }
};

/**
 * Cancel an order
 * @param orderId Order ID to cancel
 */
export const cancelOrder = async (orderId: string) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to cancel an order');
    }
    
    const orderRef = firestore().collection('orders').doc(orderId);
    const orderSnapshot = await orderRef.get();
    
    if (!orderSnapshot.exists) {
      throw new Error('Order not found');
    }
    
    const orderData = orderSnapshot.data() as Order;
    
    // Check if the order belongs to the current user
    if (orderData.userId !== user.uid) {
      throw new Error('You do not have permission to cancel this order');
    }
    
    // Only allow cancellation of pending or processing orders
    if (orderData.status !== 'pending' && orderData.status !== 'processing') {
      throw new Error('This order cannot be cancelled');
    }
    
    // Update order status to cancelled
    await orderRef.update({
      status: 'cancelled',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    // If this is a bid order, update the bid offer status
    if (orderData.isBidOrder && orderData.bidOfferId) {
      await firestore().collection('bidOffers').doc(orderData.bidOfferId).update({
        status: 'rejected',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }
    
    return { success: true, orderId };
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};