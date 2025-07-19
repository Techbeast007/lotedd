import { useBigShip } from '@/hooks/useBigShip';
import { PaymentType, RiskType, ShipmentCategory } from '@/services/bigshipService';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

// Assuming you have a cart context or service
import { useCart } from '@/services/context/CartContext';

export default function ShippingRatesComponent({ 
  sourcePostalCode, 
  destinationPostalCode,
  isB2B = false,
  onSelectRate
}) {
  const { calculateRates } = useBigShip();
  const { cart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shippingRates, setShippingRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);

  // Calculate total dimensions and weight from cart items
  const dimensions = React.useMemo(() => {
    return cart.items.reduce(
      (acc, item) => {
        // Sum total weight
        acc.totalWeight += (item.weight * item.quantity);
        
        // Calculate total volume
        const itemVolume = item.length * item.width * item.height * item.quantity;
        acc.totalVolume += itemVolume;
        
        // Track largest dimensions for determining box size
        acc.maxLength = Math.max(acc.maxLength, item.length);
        acc.maxWidth = Math.max(acc.maxWidth, item.width);
        acc.maxHeight = Math.max(acc.maxHeight, item.height);
        
        return acc;
      },
      { totalWeight: 0, totalVolume: 0, maxLength: 0, maxWidth: 0, maxHeight: 0 }
    );
  }, [cart.items]);
  
  // Calculate approximate box dimensions based on total volume
  // In a real scenario, you'd have proper box packing algorithm
  const boxDimensions = React.useMemo(() => {
    // Start with largest item dimensions as minimum
    let length = dimensions.maxLength;
    let width = dimensions.maxWidth;
    let height = dimensions.maxHeight;
    
    // If total volume is larger than the volume of our initial box,
    // we need to scale up the box size
    const initialBoxVolume = length * width * height;
    if (dimensions.totalVolume > initialBoxVolume) {
      // Simple scaling approach - better implementations would use packing algorithms
      const scaleFactor = Math.cbrt(dimensions.totalVolume / initialBoxVolume);
      length = Math.ceil(length * scaleFactor);
      width = Math.ceil(width * scaleFactor);
      height = Math.ceil(height * scaleFactor);
    }
    
    return { length, width, height };
  }, [dimensions]);
  
  // Calculate shipping rates when address or cart changes
  useEffect(() => {
    if (sourcePostalCode && destinationPostalCode && cart.items.length > 0) {
      getShippingRates();
    }
  }, [sourcePostalCode, destinationPostalCode, cart.items]);
  
  const getShippingRates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const rateData = {
        shipment_category: isB2B ? ShipmentCategory.B2B : ShipmentCategory.B2C,
        payment_type: cart.paymentMethod === 'cod' ? PaymentType.COD : PaymentType.Prepaid,
        pickup_pincode: parseInt(sourcePostalCode),
        destination_pincode: parseInt(destinationPostalCode),
        shipment_invoice_amount: cart.totalAmount,
        // Only add risk type for B2B shipments
        ...(isB2B ? { risk_type: RiskType.OwnerRisk } : {}),
        box_details: [{
          each_box_dead_weight: dimensions.totalWeight,
          each_box_length: boxDimensions.length,
          each_box_width: boxDimensions.width,
          each_box_height: boxDimensions.height,
          box_count: 1,
          // Can include product_details if needed for accurate rates
          product_details: cart.items.map(item => ({
            product_category: item.category || "Others",
            product_name: item.name,
            product_quantity: item.quantity
          }))
        }]
      };
      
      const rates = await calculateRates(rateData);
      
      if (rates && rates.length > 0) {
        setShippingRates(rates);
        
        // Auto-select the cheapest option
        const cheapestRate = [...rates].sort((a, b) => 
          a.total_shipping_charges - b.total_shipping_charges
        )[0];
        
        setSelectedRate(cheapestRate);
        if (onSelectRate) onSelectRate(cheapestRate);
      } else {
        setError('No shipping options available for this address');
      }
    } catch (err) {
      console.error('Failed to get shipping rates:', err);
      setError('Could not calculate shipping rates. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectRate = (rate) => {
    setSelectedRate(rate);
    if (onSelectRate) onSelectRate(rate);
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Calculating shipping rates...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shipping Options</Text>
      
      {shippingRates.length === 0 ? (
        <Text style={styles.noRates}>
          Enter your shipping address to see delivery options
        </Text>
      ) : (
        <ScrollView style={styles.ratesContainer}>
          {shippingRates.map((rate, index) => (
            <ShippingOption
              key={index}
              rate={rate}
              isSelected={selectedRate?.courier_id === rate.courier_id}
              onSelect={() => handleSelectRate(rate)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Individual shipping option component
function ShippingOption({ rate, isSelected, onSelect }) {
  // Estimated delivery date calculation
  const estimatedDelivery = React.useMemo(() => {
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + (rate.tat || 3)); // Default to 3 days if TAT not provided
    
    return deliveryDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  }, [rate]);
  
  return (
    <View
      style={[
        styles.shippingOption,
        isSelected && styles.selectedOption
      ]}
    >
      <View style={styles.radioContainer}>
        <View style={styles.radioOuter}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </View>
      
      <View style={styles.optionContent}>
        <View style={styles.optionHeader}>
          <Text style={styles.courierName}>{rate.courier_name}</Text>
          <Text style={styles.shippingCost}>₹{rate.total_shipping_charges}</Text>
        </View>
        
        <Text style={styles.deliveryEstimate}>
          Estimated delivery: {estimatedDelivery}
        </Text>
        
        {rate.risk_type_name && (
          <Text style={styles.riskType}>
            {rate.risk_type_name}
          </Text>
        )}
      </View>
      
      <View style={styles.touchableArea} onTouchEnd={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fff3f3',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
  },
  noRates: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
  ratesContainer: {
    maxHeight: 200,
  },
  shippingOption: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
  },
  selectedOption: {
    backgroundColor: '#f0f7ff',
  },
  radioContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0066cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0066cc',
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  courierName: {
    fontSize: 16,
    fontWeight: '600',
  },
  shippingCost: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deliveryEstimate: {
    fontSize: 14,
    color: '#666',
  },
  riskType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  touchableArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }
});
