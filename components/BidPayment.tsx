import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import { ArrowRight, CheckCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

import { getCurrentUser } from '@/services/authService';
import { BidOffer } from '@/services/biddingService';
import { handleRazorpaySuccess, processBidPayment } from '@/services/paymentService';

interface BidPaymentProps {
  bidOffer: BidOffer;
  onPaymentSuccess?: () => void;
  onPaymentFailure?: (error: any) => void;
}

const BidPayment: React.FC<BidPaymentProps> = ({ 
  bidOffer, 
  onPaymentSuccess, 
  onPaymentFailure 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();
  const router = useRouter();

  // Calculate total price
  const totalAmount = bidOffer.bidAmount * bidOffer.quantity;
  
  // Format the total price with Indian currency
  const formattedTotal = totalAmount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Format the 50% advance payment
  const advancePayment = Math.ceil(totalAmount * 0.5);
  const formattedAdvance = advancePayment.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Format the remaining payment
  const remainingPayment = totalAmount - advancePayment;
  const formattedRemaining = remainingPayment.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const handleBidPayment = async () => {
    try {
      // Check if user is logged in
      const user = getCurrentUser();
      if (!user) {
        toast.show({
          render: () => (
            <Toast action="error">
              <VStack space="xs">
                <ToastTitle>Authentication Required</ToastTitle>
                <ToastDescription>You must be logged in to process payment</ToastDescription>
              </VStack>
            </Toast>
          )
        });
        router.push('/(auth)');
        return;
      }

      setIsProcessing(true);

      // Create an order for the bid
      const order = await processBidPayment(bidOffer);

      // Open Razorpay checkout
      const paymentData = await RazorpayCheckout.open({
        description: `Payment for bid on ${bidOffer.productName || 'Product'}`,
        image: 'https://your-app-logo-url.png',
        currency: 'INR',
        key: 'rzp_test_YOUR_KEY_HERE', // This should match the key in paymentService.ts
        amount: advancePayment * 100, // Razorpay expects amount in paise
        name: 'Lotedd',
        order_id: order.id,
        prefill: {
          email: user.email || '',
          contact: user.phoneNumber || '',
          name: user.displayName || '',
        },
        theme: { color: '#3B82F6' }
      });

      // Handle successful payment
      const result = await handleRazorpaySuccess(order.id as string, paymentData);

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

      // Call success callback if provided
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (error: any) {
      console.error('Bid payment error:', error);
      
      toast.show({
        render: () => (
          <Toast action="error">
            <VStack space="xs">
              <ToastTitle>Payment Failed</ToastTitle>
              <ToastDescription>
                {error?.message || 'Failed to process payment. Please try again.'}
              </ToastDescription>
            </VStack>
          </Toast>
        )
      });

      // Call failure callback if provided
      if (onPaymentFailure) {
        onPaymentFailure(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card style={styles.container}>
      <Box style={styles.header}>
        <Text style={styles.title}>Bid Payment Summary</Text>
      </Box>

      <Box style={styles.content}>
        {/* Payment details */}
        <VStack style={styles.paymentDetails}>
          <HStack style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bid Amount</Text>
            <Text style={styles.detailValue}>₹{bidOffer.bidAmount} per unit</Text>
          </HStack>
          
          <HStack style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{bidOffer.quantity} units</Text>
          </HStack>
          
          <View style={styles.divider} />
          
          <HStack style={styles.detailRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formattedTotal}</Text>
          </HStack>
        </VStack>

        {/* Payment Breakdown */}
        <VStack style={styles.paymentBreakdown}>
          <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
          
          <HStack style={styles.breakdownRow}>
            <HStack style={styles.breakdownLeft}>
              <View style={styles.checkpointActive}>
                <CheckCircle size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.checkpointText}>Advance Payment (50%)</Text>
            </HStack>
            <Text style={styles.advanceAmount}>{formattedAdvance}</Text>
          </HStack>
          
          <View style={styles.timeline} />
          
          <HStack style={styles.breakdownRow}>
            <HStack style={styles.breakdownLeft}>
              <View style={styles.checkpointInactive}>
                <Text style={styles.checkpointNumber}>2</Text>
              </View>
              <Text style={styles.checkpointText}>Remaining Payment</Text>
            </HStack>
            <Text style={styles.remainingAmount}>{formattedRemaining}</Text>
          </HStack>
        </VStack>

        {/* Pay button */}
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={handleBidPayment}
          disabled={isProcessing}
        >
          <HStack style={{ alignItems: 'center', gap: 8 }}>
            <Text style={styles.payButtonText}>
              {isProcessing ? 'Processing Payment...' : 'Pay Now'}
            </Text>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ArrowRight size={18} color="#FFFFFF" />
            )}
          </HStack>
        </TouchableOpacity>

        <Text style={styles.paymentNote}>
          By proceeding with this payment, you agree to the terms and conditions of this bid offer.
          The remaining 50% will be collected upon delivery.
        </Text>
      </Box>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    backgroundColor: '#F5F3FF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9D8FD',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5B21B6',
  },
  content: {
    padding: 16,
  },
  paymentDetails: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentBreakdown: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkpointActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkpointInactive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkpointNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  checkpointText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  timeline: {
    width: 2,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginLeft: 12,
    marginBottom: 16,
  },
  advanceAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  },
  remainingAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
  },
  payButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  payButtonDisabled: {
    backgroundColor: '#818CF8',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default BidPayment;