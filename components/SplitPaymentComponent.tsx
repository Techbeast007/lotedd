import { Button } from '@/components/ui/button';
import { useRazorpay } from '@/hooks/useRazorpay';
import { Order } from '@/services/paymentService';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

interface SplitPaymentProps {
  order: Order;
  onPaymentComplete: (result: { success: boolean; paymentId?: string; error?: string }) => void;
  onPaymentCancel: () => void;
}

/**
 * A component that handles split payment flow (50% via Razorpay, 50% via COD)
 */
export const SplitPaymentComponent = ({ 
  order, 
  onPaymentComplete, 
  onPaymentCancel 
}: SplitPaymentProps) => {
  const { processPayment, loading, error } = useRazorpay();
  const [processing, setProcessing] = useState(false);

  // Calculate 50% of total amount
  const advanceAmount = Math.ceil(order.totalAmount * 0.5);
  const codAmount = Math.floor(order.totalAmount * 0.5);

  const handleProcessPayment = async () => {
    try {
      setProcessing(true);

      // Process payment via Razorpay
      const result = await processPayment({
        amount: advanceAmount * 100, // Convert to paise
        currency: 'INR',
        receipt: order.id || 'order-' + Date.now()
      });

      setProcessing(false);

      if (result.success) {
        onPaymentComplete(result);
      } else {
        Alert.alert(
          'Payment Failed',
          result.error || 'There was a problem processing your payment.',
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      setProcessing(false);
      Alert.alert('Error', err.message || 'An unexpected error occurred');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Split Payment</Text>
      
      <View style={styles.paymentSummary}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        <View style={styles.row}>
          <Text>Total Order Amount:</Text>
          <Text style={styles.amount}>₹{order.totalAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Advance Payment (50%):</Text>
          <Text style={styles.amount}>₹{advanceAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text>COD Amount (50%):</Text>
          <Text style={styles.amount}>₹{codAmount.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.description}>
        You will be charged 50% of the total order amount now via online payment, 
        and the remaining 50% will be collected as Cash on Delivery.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.buttonContainer}>
        <Button
          size="md"
          variant="outline"
          action="secondary"
          onPress={onPaymentCancel}
          disabled={processing || loading}
          style={styles.button}
        >
          <Text>Cancel</Text>
        </Button>
        
        <Button
          size="md"
          action="primary"
          onPress={handleProcessPayment}
          disabled={processing || loading}
          style={styles.button}
        >
          {(processing || loading) ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Pay ₹{advanceAmount}</Text>
          )}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  paymentSummary: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amount: {
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    margin: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  }
});

export default SplitPaymentComponent;
