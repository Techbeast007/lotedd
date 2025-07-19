import ShippingRatesComponent from '@/components/ShippingRatesComponent';
import { Button } from '@/components/ui/button';
import { useCart } from '@/services/context/CartContext';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface ShippingRate {
  courier_id: number;
  courier_name: string;
  total_shipping_charges: number;
  tat?: number; // Time to arrival in days
  risk_type_name?: string;
}

export default function CartSummary() {
  const { 
    items, 
    totalPrice, 
    shippingCost, 
    setShippingCost,
    selectedCourier,
    setSelectedCourier,
    shippingAddress,
    updateShippingAddress
  } = useCart();
  const [shippingRate, setShippingRate] = useState<ShippingRate | null>(null);
  const [destinationPostcode, setDestinationPostcode] = useState('');
  
  // This would typically come from user profile or warehouse settings
  const sourcePostcode = '110001'; // e.g., Delhi warehouse pincode
  
  // Update cart totals when shipping rate changes
  useEffect(() => {
    if (shippingRate) {
      setShippingCost(shippingRate.total_shipping_charges);
      setSelectedCourier({
        id: shippingRate.courier_id,
        name: shippingRate.courier_name
      });
    }
  }, [shippingRate, setShippingCost, setSelectedCourier]);
  
  // Get shipping rate from address input component or user profile
  useEffect(() => {
    // This would be populated from the user's saved address or their input
    if (shippingAddress?.pincode) {
      setDestinationPostcode(shippingAddress.pincode);
    }
  }, [shippingAddress]);
  
  // Calculate subtotal, tax, and discount
  const subtotal = totalPrice || 0;
  const tax = 0; // Assume no tax for now or calculate based on your business logic
  const discount = 0; // Assume no discount for now or get from your discount logic
  const isB2B = false; // Set based on your business logic
  
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };
  
  const handleShippingRateSelect = (rate: ShippingRate) => {
    setShippingRate(rate);
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        
        {/* Items Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Items ({items.length})</Text>
          
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.product.name} x{item.quantity}
              </Text>
              <Text style={styles.itemPrice}>
                ₹{((item.product.discountPrice || item.product.basePrice) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Price Summary */}
        <View style={styles.summarySection}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Subtotal</Text>
            <Text style={styles.costValue}>₹{formatCurrency(subtotal)}</Text>
          </View>
          
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Tax</Text>
            <Text style={styles.costValue}>₹{formatCurrency(tax)}</Text>
          </View>
          
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Shipping</Text>
            <Text style={styles.costValue}>
              {shippingCost > 0 ? 
                `₹${formatCurrency(shippingCost)}` : 
                'Calculate below'
              }
            </Text>
          </View>
          
          {/* Show discount if applicable */}
          {discount > 0 && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Discount</Text>
              <Text style={[styles.costValue, styles.discountText]}>
                -₹{formatCurrency(discount)}
              </Text>
            </View>
          )}
          
          {/* Total */}
          <View style={[styles.costRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              ₹{formatCurrency(subtotal + tax + shippingCost - discount)}
            </Text>
          </View>
        </View>
        
        {/* Shipping Options */}
        {destinationPostcode ? (
          <ShippingRatesComponent
            sourcePostalCode={sourcePostcode}
            destinationPostalCode={destinationPostcode}
            isB2B={isB2B}
            onSelectRate={handleShippingRateSelect}
          />
        ) : (
          <View style={styles.noAddressContainer}>
            <Text style={styles.noAddressText}>
              Please add a shipping address to see delivery options
            </Text>
          </View>
        )}
        
        {/* Payment Split for B2B orders */}
        {isB2B && (
          <View style={styles.paymentSplitContainer}>
            <Text style={styles.paymentSplitTitle}>Payment Split</Text>
            
            <View style={styles.paymentSplitRow}>
              <View style={styles.paymentHalf}>
                <Text style={styles.paymentLabel}>Advance Payment</Text>
                <Text style={styles.paymentAmount}>
                  ₹{formatCurrency((subtotal + tax + shippingCost - discount) * 0.5)}
                </Text>
              </View>
              
              <View style={styles.paymentSeparator} />
              
              <View style={styles.paymentHalf}>
                <Text style={styles.paymentLabel}>COD Amount</Text>
                <Text style={styles.paymentAmount}>
                  ₹{formatCurrency((subtotal + tax + shippingCost - discount) * 0.5)}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Checkout Button */}
        <Button
          size="lg"
          disabled={!shippingRate}
          onPress={() => {/* Navigate to checkout */}}
          style={styles.checkoutButton}
        >
          {shippingCost > 0 ? 'Proceed to Payment' : 'Select Shipping Method'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summarySection: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 14,
  },
  discountText: {
    color: '#28a745',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noAddressContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noAddressText: {
    color: '#666',
    fontStyle: 'italic',
  },
  paymentSplitContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paymentSplitTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentSplitRow: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  paymentHalf: {
    flex: 1,
    alignItems: 'center',
  },
  paymentSeparator: {
    width: 1,
    backgroundColor: '#ddd',
    marginHorizontal: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkoutButton: {
    marginTop: 24,
  },
});
