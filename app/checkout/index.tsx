import { Button } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ShippingRatesComponent } from '@/components/ShippingRatesComponent';
import SplitPaymentComponent from '@/components/SplitPaymentComponent';
import { useCart } from '@/services/context/CartContext';
import { Order } from '@/services/paymentService';

export default function CheckoutScreen() {
  const router = useRouter();
  const { cart, cartTotal, clearCart } = useCart();
  const [selectedShippingRate, setSelectedShippingRate] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  
  // Create order object based on cart contents
  const order: Order = {
    id: 'temp-' + Date.now(),
    userId: 'current-user', // This would be fetched from user context
    items: cart,
    totalAmount: cartTotal + (selectedShippingRate?.total_amount || 0),
    paidAmount: 0,
    remainingAmount: cartTotal + (selectedShippingRate?.total_amount || 0),
    status: 'pending',
    paymentStatus: 'pending',
  };

  const handleShippingRateSelected = (rate: any) => {
    setSelectedShippingRate(rate);
  };

  const handleProceedToPayment = () => {
    if (!selectedShippingRate) {
      Alert.alert('Shipping Method Required', 'Please select a shipping method to continue.');
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentComplete = async (result: { success: boolean; paymentId?: string }) => {
    if (result.success) {
      Alert.alert(
        'Payment Successful',
        'Your payment has been processed successfully. Your order is now being prepared.',
        [
          {
            text: 'OK',
            onPress: () => {
              clearCart();
              router.push('/orders');
            }
          }
        ]
      );
    }
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Checkout</Text>

      {cart.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Your cart is empty</Text>
          <Button onPress={() => router.push('/(buyer)/home')}>
            <Text style={styles.buttonText}>Continue Shopping</Text>
          </Button>
        </View>
      ) : (
        <VStack space={4}>
          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {cart.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <Text style={styles.productName}>{item.product.name}</Text>
                <View style={styles.cartItemDetails}>
                  <Text>Qty: {item.quantity}</Text>
                  <Text style={styles.price}>₹{item.product.price * item.quantity}</Text>
                </View>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text style={styles.price}>₹{cartTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Shipping Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Method</Text>
            <ShippingRatesComponent 
              onRateSelected={handleShippingRateSelected}
              selectedRate={selectedShippingRate}
            />
            {selectedShippingRate && (
              <View style={styles.totalRow}>
                <Text>Shipping Cost</Text>
                <Text style={styles.price}>₹{selectedShippingRate.total_amount.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Total */}
          <View style={styles.section}>
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={[styles.price, styles.totalText]}>
                ₹{(cartTotal + (selectedShippingRate?.total_amount || 0)).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Payment Section */}
          {!showPayment ? (
            <Button onPress={handleProceedToPayment}>
              <Text style={styles.buttonText}>Proceed to Payment</Text>
            </Button>
          ) : (
            <SplitPaymentComponent 
              order={order}
              onPaymentComplete={handlePaymentComplete}
              onPaymentCancel={handlePaymentCancel}
            />
          )}
        </VStack>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  cartItem: {
    marginBottom: 12,
  },
  cartItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    marginBottom: 4,
  },
  price: {
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  }
});
