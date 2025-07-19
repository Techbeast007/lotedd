import firestore from '@react-native-firebase/firestore';
import { getCurrentUser } from './authService';

/**
 * Creates a payment record in Firestore
 * @param paymentData Payment data to save
 */
export const createPayment = async (paymentData: {
  orderId: string;
  amount: number;
  paymentId: string;
  type: 'advance' | 'remaining' | 'full';
}) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to create a payment');
    }

    const payment = {
      ...paymentData,
      userId: user.uid,
      currency: 'INR',
      status: 'completed',
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore().collection('payments').add(payment);
    return { success: true };
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};

/**
 * Saves order details to Firestore
 * @param orderDetails Order details to save
 */
export const saveOrderDetails = async (orderDetails: {
  orderId: string;
  systemOrderId: number;
  customer: {
    name: string;
    company?: string;
    email: string;
    phone: string;
  };
  shipping: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  products: {
    name: string;
    category: string;
    quantity: number;
    weight: number;
    length: number;
    width: number;
    height: number;
  }[];
  payment: {
    total: number;
    advance: number;
    cod: number;
  };
  status: string;
}) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to save order details');
    }

    const orderData = {
      ...orderDetails,
      userId: user.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore().collection('heavyOrders').doc(orderDetails.orderId).set(orderData);
    return { success: true };
  } catch (error) {
    console.error('Error saving order details:', error);
    throw error;
  }
};

/**
 * Updates an existing order in Firestore
 * @param orderId The ID of the order to update
 * @param updates The fields to update
 */
export const updateOrder = async (orderId: string, updates: any) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to update an order');
    }

    const orderRef = firestore().collection('heavyOrders').doc(orderId);
    
    // Add timestamp to updates
    const updatedData = {
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await orderRef.update(updatedData);
    return { success: true };
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
};

/**
 * Get a specific heavy order by ID
 * @param orderId The ID of the order to retrieve
 */
export const getHeavyOrderById = async (orderId: string) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to view order details');
    }

    const orderDoc = await firestore().collection('heavyOrders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }

    return {
      id: orderDoc.id,
      ...orderDoc.data()
    };
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

/**
 * Get all heavy orders for the current user
 */
export const getUserHeavyOrders = async () => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to view orders');
    }

    const ordersSnapshot = await firestore()
      .collection('heavyOrders')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    
    return ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user orders:', error);
    throw error;
  }
};
