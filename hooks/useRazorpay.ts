import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { handleRazorpayFailure, handleRazorpaySuccess, initializeRazorpayPayment, Order } from '../services/paymentService';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentOptions {
  amount: number; // in paise (100 paise = 1 INR)
  currency: string;
  receipt: string;
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

/**
 * Hook to handle Razorpay payment processing
 * This hook provides methods to process payments through Razorpay
 * It handles both web and mobile platforms
 */
export const useRazorpay = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Razorpay script for web
    if (Platform.OS === 'web') {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  /**
   * Process a payment through Razorpay
   * @param options Payment options
   * @returns Result of payment process
   */
  const processPayment = async (options: PaymentOptions): Promise<PaymentResult> => {
    setLoading(true);
    setError(null);

    try {
      // Create a mock order object to pass to initializeRazorpayPayment
      const mockOrder: Order = {
        id: options.receipt,
        userId: 'current-user-id', // This would be the actual user ID in a real scenario
        items: [],
        totalAmount: options.amount / 100, // Convert from paise to INR
        paidAmount: 0,
        remainingAmount: options.amount / 100,
        status: 'pending',
        paymentStatus: 'pending'
      };

      // Initialize Razorpay payment
      const razorpayOptions = await initializeRazorpayPayment(mockOrder);

      // For web, use the web SDK
      if (Platform.OS === 'web') {
        return new Promise<PaymentResult>((resolve) => {
          const rzp = new window.Razorpay({
            ...razorpayOptions,
            handler: (response: any) => {
              // Handle successful payment
              handleRazorpaySuccess(options.receipt, {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }).then(() => {
                resolve({
                  success: true,
                  paymentId: response.razorpay_payment_id
                });
              }).catch(err => {
                setError(err.message);
                resolve({
                  success: false,
                  error: err.message
                });
              }).finally(() => {
                setLoading(false);
              });
            },
            modal: {
              ondismiss: () => {
                setLoading(false);
                resolve({
                  success: false,
                  error: 'Payment cancelled'
                });
              }
            }
          });
          
          rzp.open();
        });
      } 
      // For native, we would use the Razorpay React Native SDK
      else {
        // Note: In a real implementation, you would import and use the Razorpay React Native SDK here
        // For now, we'll just simulate a successful payment for testing purposes
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const simulatedResponse = {
          razorpay_payment_id: `pay_${Math.random().toString(36).substring(7)}`,
          razorpay_order_id: `order_${Math.random().toString(36).substring(7)}`,
          razorpay_signature: `sig_${Math.random().toString(36).substring(7)}`
        };
        
        await handleRazorpaySuccess(options.receipt, simulatedResponse);
        
        setLoading(false);
        return {
          success: true,
          paymentId: simulatedResponse.razorpay_payment_id
        };
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
      setLoading(false);
      return {
        success: false,
        error: err.message || 'Payment processing failed'
      };
    }
  };

  /**
   * Handle payment failure
   * @param orderId Order ID
   * @param error Error details
   */
  const handleFailure = async (orderId: string, error: any) => {
    try {
      await handleRazorpayFailure(orderId, error);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return {
    processPayment,
    handleFailure,
    loading,
    error
  };
};
