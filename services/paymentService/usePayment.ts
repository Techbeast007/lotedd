import { useState } from 'react';
import RazorpayCheckout from 'react-native-razorpay';
import { useRouter } from 'expo-router';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';

import {
  Order,
  createOrder,
  initializeRazorpayPayment,
  handleRazorpaySuccess,
  handleRazorpayFailure,
  processBidPayment,
  processRemainingPayment,
  handleRemainingPaymentSuccess,
} from '../paymentService';
import { BidOffer } from '../biddingService';
import { CartItem } from '../cartService';

interface PaymentHookProps {
  onSuccess?: (data: any) => void;
  onFailure?: (error: any) => void;
  onComplete?: () => void;
}

export const usePayment = (props?: PaymentHookProps) => {
  const { onSuccess, onFailure, onComplete } = props || {};
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  // Process cart checkout (50% payment)
  const processCartCheckout = async (
    items: CartItem[],
    totalAmount: number,
    shippingAddress?: any
  ) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Create an order
      const order = await createOrder(items, totalAmount, false, undefined, undefined, shippingAddress);

      // Get Razorpay options
      const options = await initializeRazorpayPayment(order);

      // Open Razorpay checkout
      const data = await RazorpayCheckout.open(options);

      // Handle successful payment
      const result = await handleRazorpaySuccess(order.id as string, data);

      toast.show({
        render: () => (
          <Toast action="success">
            <VStack space="xs">
              <ToastTitle>Payment Successful</ToastTitle>
              <ToastDescription>
                Your order has been confirmed with 50% payment. Remaining payment will be due upon delivery.
              </ToastDescription>
            </VStack>
          </Toast>
        )
      });

      if (onSuccess) {
        onSuccess(result);
      }

      // Navigate to orders screen
      router.push('/(buyer)/orders');
      return result;

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err?.message || 'Payment failed');

      // Show error message
      toast.show({
        render: () => (
          <Toast action="error">
            <VStack space="xs">
              <ToastTitle>Payment Failed</ToastTitle>
              <ToastDescription>
                {err?.message || 'Failed to process payment. Please try again.'}
              </ToastDescription>
            </VStack>
          </Toast>
        )
      });

      if (onFailure) {
        onFailure(err);
      }
    } finally {
      setIsProcessing(false);
      if (onComplete) {
        onComplete();
      }
    }
  };

  // Process bid payment (50% payment)
  const processBidCheckout = async (bidOffer: BidOffer) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Create an order for the bid
      const order = await processBidPayment(bidOffer);

      // Get Razorpay options
      const options = await initializeRazorpayPayment(order);

      // Open Razorpay checkout
      const data = await RazorpayCheckout.open(options);

      // Handle successful payment
      const result = await handleRazorpaySuccess(order.id as string, data);

      toast.show({
        render: () => (
          <Toast action="success">
            <VStack space="xs">
              <ToastTitle>Bid Payment Successful</ToastTitle>
              <ToastDescription>
                Your bid has been confirmed with 50% advance payment.
              </ToastDescription>
            </VStack>
          </Toast>
        )
      });

      if (onSuccess) {
        onSuccess(result);
      }

      // Navigate to orders screen
      router.push('/(buyer)/orders');
      return result;

    } catch (err: any) {
      console.error('Bid payment error:', err);
      setError(err?.message || 'Bid payment failed');

      // Show error message
      toast.show({
        render: () => (
          <Toast action="error">
            <VStack space="xs">
              <ToastTitle>Bid Payment Failed</ToastTitle>
              <ToastDescription>
                {err?.message || 'Failed to process bid payment. Please try again.'}
              </ToastDescription>
            </VStack>
          </Toast>
        )
      });

      if (onFailure) {
        onFailure(err);
      }
    } finally {
      setIsProcessing(false);
      if (onComplete) {
        onComplete();
      }
    }
  };

  // Process remaining payment (second 50%)
  const processRemainingOrderPayment = async (orderId: string) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Get Razorpay options for remaining payment
      const options = await processRemainingPayment(orderId);

      // Open Razorpay checkout
      const data = await RazorpayCheckout.open(options);

      // Handle successful payment
      const result = await handleRemainingPaymentSuccess(orderId, data);

      toast.show({
        render: () => (
          <Toast action="success">
            <VStack space="xs">
              <ToastTitle>Payment Completed</ToastTitle>
              <ToastDescription>
                Your payment has been completed successfully.
              </ToastDescription>
            </VStack>
          </Toast>
        )
      });

      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;

    } catch (err: any) {
      console.error('Remaining payment error:', err);
      setError(err?.message || 'Remaining payment failed');

      // Show error message
      toast.show({
        render: () => (
          <Toast action="error">
            <VStack space="xs">
              <ToastTitle>Payment Failed</ToastTitle>
              <ToastDescription>
                {err?.message || 'Failed to process remaining payment. Please try again.'}
              </ToastDescription>
            </VStack>
          </Toast>
        )
      });

      if (onFailure) {
        onFailure(err);
      }
    } finally {
      setIsProcessing(false);
      if (onComplete) {
        onComplete();
      }
    }
  };

  return {
    isProcessing,
    error,
    processCartCheckout,
    processBidCheckout,
    processRemainingOrderPayment
  };
};