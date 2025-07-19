import { useBigShip } from '@/hooks/useBigShip';
import { PaymentType, ShipmentCategory } from '@/services/bigshipService';
import { useCart } from '@/services/context/CartContext';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ShippingCalculatorProps {
  sourcePostcode: string;
  onSelectRate?: (rate: any) => void;
}

export default function ShippingCalculator({ sourcePostcode, onSelectRate }: ShippingCalculatorProps) {
  const { calculateRates } = useBigShip();
  const { items, shippingAddress, updateShippingAddress, setShippingCost, setSelectedCourier } = useCart();
  
  const [pincode, setPincode] = useState<string>(shippingAddress?.pincode || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [rates, setRates] = useState<any[]>([]);
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate dimensions from cart items
  const dimensions = React.useMemo(() => {
    if (!items || items.length === 0) return { totalWeight: 0.5, length: 10, width: 10, height: 10 };
    
    const totals = items.reduce(
      (acc, item) => {
        // Assume default values if product doesn't have dimensions
        const weight = item.product.weight || 0.5;
        const length = item.product.length || 10;
        const width = item.product.width || 10;
        const height = item.product.height || 10;
        
        // Sum total weight
        acc.totalWeight += (weight * item.quantity);
        
        // Track largest dimensions
        acc.maxLength = Math.max(acc.maxLength, length);
        acc.maxWidth = Math.max(acc.maxWidth, width);
        acc.maxHeight = Math.max(acc.maxHeight, height);
        
        return acc;
      },
      { totalWeight: 0, maxLength: 0, maxWidth: 0, maxHeight: 0 }
    );
    
    return {
      totalWeight: Math.max(0.5, totals.totalWeight), // Minimum 500g
      length: Math.max(10, totals.maxLength),
      width: Math.max(10, totals.maxWidth),
      height: Math.max(10, totals.maxHeight)
    };
  }, [items]);
  
  // Load rates if pincode is provided
  useEffect(() => {
    if (shippingAddress?.pincode) {
      getShippingRates(shippingAddress.pincode);
    }
  }, [shippingAddress?.pincode]);
  
  // Apply selected rate to cart
  useEffect(() => {
    if (selectedRate) {
      setShippingCost(selectedRate.total_shipping_charges);
      setSelectedCourier({
        id: selectedRate.courier_id,
        name: selectedRate.courier_name
      });
      if (onSelectRate) onSelectRate(selectedRate);
    }
  }, [selectedRate]);
  
  const getShippingRates = async (destinationPincode: string) => {
    if (!destinationPincode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const rateData = {
        shipment_category: ShipmentCategory.B2C,
        payment_type: PaymentType.Prepaid,
        pickup_pincode: parseInt(sourcePostcode),
        destination_pincode: parseInt(destinationPincode),
        shipment_invoice_amount: items.reduce((sum, item) => {
          const itemPrice = item.product.discountPrice || item.product.basePrice;
          return sum + (itemPrice * item.quantity);
        }, 0),
        box_details: [{
          each_box_dead_weight: dimensions.totalWeight,
          each_box_length: dimensions.length,
          each_box_width: dimensions.width,
          each_box_height: dimensions.height,
          box_count: 1
        }]
      };
      
      const result = await calculateRates(rateData);
      
      if (result && result.length > 0) {
        setRates(result);
        
        // Auto-select cheapest option
        const cheapestRate = [...result].sort((a, b) => 
          a.total_shipping_charges - b.total_shipping_charges
        )[0];
        
        setSelectedRate(cheapestRate);
      } else {
        setError('No shipping options available for this pincode');
      }
    } catch (err) {
      console.error('Failed to get shipping rates:', err);
      setError('Could not calculate shipping rates');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApplyPincode = () => {
    if (pincode && pincode.length === 6) {
      updateShippingAddress({ ...shippingAddress, pincode });
      getShippingRates(pincode);
    } else {
      setError('Please enter a valid 6-digit pincode');
    }
  };
  
  const handleSelectRate = (rate: any) => {
    setSelectedRate(rate);
  };
  
  return (
    <View style={styles.container}>
      {/* Pincode Input */}
      <View style={styles.pincodeContainer}>
        <TextInput
          style={styles.pincodeInput}
          placeholder="Enter Delivery Pincode"
          keyboardType="number-pad"
          value={pincode}
          onChangeText={setPincode}
          maxLength={6}
        />
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplyPincode}
          disabled={loading}
        >
          <Text style={styles.applyButtonText}>
            {loading ? 'Loading...' : 'Apply'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007BFF" />
          <Text style={styles.loadingText}>Calculating shipping rates...</Text>
        </View>
      )}
      
      {/* Rates Display */}
      {rates.length > 0 && !loading && (
        <View style={styles.ratesContainer}>
          {rates.slice(0, 3).map((rate, index) => (
            <TouchableOpacity
              key={rate.courier_id}
              style={[
                styles.rateItem,
                selectedRate?.courier_id === rate.courier_id && styles.selectedRate
              ]}
              onPress={() => handleSelectRate(rate)}
            >
              <View style={styles.radioContainer}>
                <View style={styles.radioOuter}>
                  {selectedRate?.courier_id === rate.courier_id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
              <View style={styles.rateDetails}>
                <Text style={styles.courierName}>{rate.courier_name}</Text>
                <Text style={styles.deliveryTime}>
                  Delivers in {rate.tat || 3}-{(rate.tat || 3) + 2} days
                </Text>
              </View>
              <Text style={styles.ratePrice}>
                ₹{rate.total_shipping_charges.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pincodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pincodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  applyButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#dc3545',
    marginTop: 8,
    fontSize: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 12,
  },
  ratesContainer: {
    marginTop: 12,
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  selectedRate: {
    borderColor: '#007BFF',
    backgroundColor: '#EBF5FF',
  },
  radioContainer: {
    marginRight: 12,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#007BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007BFF',
  },
  rateDetails: {
    flex: 1,
  },
  courierName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  deliveryTime: {
    fontSize: 12,
    color: '#666',
  },
  ratePrice: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#007BFF',
  },
});
