import ShippingCalculator from '@/components/ShippingCalculator';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { CartItem } from '@/services/cartService';
import { useCart } from '@/services/context/CartContext';
import { useRouter } from 'expo-router';
import { Heart, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Animated, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CartScreen() {
  const { items, removeItem, updateQuantity, clearItems, totalPrice, shippingCost } = useCart();
  const insets = useSafeAreaInsets();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const router = useRouter();

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleCheckout = () => {
    router.push('/(checkout)');
  };

  const renderItem = ({ item, index }: { item: CartItem; index: number }) => {
    const itemPrice = item.product.discountPrice && item.product.discountPrice > 0 
      ? item.product.discountPrice 
      : item.product.basePrice;
    
    return (
      <Card className="mb-4 mx-1 overflow-hidden" style={{
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
      }}>
        <Box className="p-4">
          <HStack className="items-start" style={{ gap: 16 }}>
            {/* Product Image */}
            <Box className="relative" style={{ flexShrink: 0 }}>
              <Image
                source={{ uri: item.product.featuredImage || 'https://via.placeholder.com/80x80?text=Product' }}
                style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 12, 
                  backgroundColor: '#F8FAFC',
                  resizeMode: 'cover'
                }}
              />
              {item.product.discountPrice && item.product.discountPrice > 0 && (
                <Box 
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full px-1.5 py-0.5"
                  style={{ minWidth: 24, alignItems: 'center' }}
                >
                  <Text className="text-xs text-white font-bold">
                    {Math.round((1 - item.product.discountPrice / item.product.basePrice) * 100)}%
                  </Text>
                </Box>
              )}
            </Box>
            
            {/* Product Details */}
            <VStack className="flex-1" style={{ gap: 6 }}>
              <VStack style={{ gap: 2 }}>
                <Text className="font-bold text-base text-gray-900" numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text className="text-sm text-gray-500">
                  {item.product.brand || 'Premium Brand'}
                </Text>
              </VStack>
              
              {/* Price Section */}
              <HStack className="items-center" style={{ gap: 6 }}>
                <Text className="text-lg font-bold text-blue-600">
                  ₹{itemPrice}
                </Text>
                {item.product.discountPrice && item.product.discountPrice > 0 && (
                  <Text className="text-xs text-gray-400 line-through">
                    ₹{item.product.basePrice}
                  </Text>
                )}
              </HStack>
              
              {/* Quantity and Actions Row */}
              <HStack className="items-center justify-between mt-2">
                {/* Quantity Controls */}
                <HStack className="items-center" style={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                    disabled={item.quantity <= 1}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: item.quantity <= 1 ? '#F1F5F9' : '#EBF4FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: item.quantity <= 1 ? '#E2E8F0' : '#DBEAFE',
                    }}
                  >
                    <Minus size={14} color={item.quantity <= 1 ? '#94A3B8' : '#3B82F6'} />
                  </TouchableOpacity>
                  
                  <Box 
                    className="bg-gray-50 rounded-lg px-3 py-1"
                    style={{ minWidth: 40, alignItems: 'center' }}
                  >
                    <Text className="text-base font-bold text-gray-900">{item.quantity}</Text>
                  </Box>
                  
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#EBF4FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#DBEAFE',
                    }}
                  >
                    <Plus size={14} color="#3B82F6" />
                  </TouchableOpacity>
                </HStack>
                
                {/* Actions */}
                <HStack className="items-center" style={{ gap: 6 }}>
                  <TouchableOpacity
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#FEF2F2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Heart size={14} color="#EF4444" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => removeItem(item.product.id)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#FEF2F2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </TouchableOpacity>
                </HStack>
              </HStack>
              
              {/* Subtotal */}
              <HStack className="justify-between items-center mt-2 pt-2 border-t border-gray-100">
                <Text className="text-sm text-gray-500">Subtotal:</Text>
                <Text className="text-base font-bold text-gray-900">
                  ₹{(itemPrice * item.quantity).toLocaleString()}
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </Box>
      </Card>
    );
  };

  const EmptyState = () => (
    <Box className="flex-1 justify-center items-center px-8 py-12">
      <Box 
        className="bg-blue-50 rounded-full p-6 mb-6"
        style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}
      >
        <ShoppingCart size={48} color="#3B82F6" />
      </Box>
      <Text className="text-xl font-bold text-gray-800 mb-2 text-center">
        Your cart is empty
      </Text>
      <Text className="text-gray-500 text-center mb-6">
        Discover amazing products and start shopping!
      </Text>
      <Button 
        size="md" 
        className="bg-blue-500 rounded-xl px-8"
        onPress={() => router.push('/(buyer)/shop')}
      >
        <ButtonText className="text-white font-bold">Start Shopping</ButtonText>
      </Button>
    </Box>
  );

  // ShippingCostDisplay Component
  const ShippingCostDisplay = () => {
    const { shippingCost, setShippingCost, shippingAddress, updateShippingAddress, selectedCourier, setSelectedCourier } = useCart();
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [pincode, setPincode] = useState(shippingAddress?.pincode || '');
    
    // This would typically come from user profile or warehouse settings
    const sourcePostcode = '110001'; // Default warehouse pincode
    
    const handleShippingRateSelect = (rate: any) => {
      setShippingCost(rate.total_shipping_charges);
      setSelectedCourier({
        id: rate.courier_id,
        name: rate.courier_name
      });
      setShowShippingModal(false);
    };
    
    // Update shipping address
    const handleSetPincode = () => {
      if (pincode) {
        updateShippingAddress({ ...shippingAddress, pincode });
        setShowShippingModal(true);
      }
    };
    
    if (!shippingAddress?.pincode) {
      return (
        <TouchableOpacity 
          onPress={() => setShowShippingModal(true)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Text className="text-blue-600 font-semibold">Calculate</Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {shippingCost > 0 ? (
            <>
              <Text className="text-base font-semibold">₹{shippingCost.toFixed(2)}</Text>
              {selectedCourier && (
                <TouchableOpacity onPress={() => setShowShippingModal(true)} style={{ marginLeft: 6 }}>
                  <Text className="text-xs text-blue-600">({selectedCourier.name})</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity onPress={() => setShowShippingModal(true)}>
              <Text className="text-base font-semibold text-blue-600">Calculate</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Modal
          visible={showShippingModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowShippingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Shipping Options</Text>
              
              {!shippingAddress?.pincode && (
                <View style={styles.pincodeContainer}>
                  <TextInput
                    style={styles.pincodeInput}
                    placeholder="Enter Delivery Pincode"
                    keyboardType="number-pad"
                    value={pincode}
                    onChangeText={setPincode}
                  />
                  <TouchableOpacity 
                    style={styles.pincodeButton}
                    onPress={handleSetPincode}
                  >
                    <Text style={styles.pincodeButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {shippingAddress?.pincode && (
                <ShippingRatesComponent
                  sourcePostalCode={sourcePostcode}
                  destinationPostalCode={shippingAddress.pincode}
                  onSelectRate={handleShippingRateSelect}
                />
              )}
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowShippingModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  // CartTotalDisplay Component
  const CartTotalDisplay = () => {
    const { totalPrice, shippingCost } = useCart();
    const total = totalPrice + shippingCost;
    
    return (
      <Text className="text-xl font-bold text-blue-600">
        ₹{total.toLocaleString()}
      </Text>
    );
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        {/* Simple Header */}
        <Box className="px-6 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900">Your Cart</Text>
          <Text className="text-sm text-gray-500">0 items</Text>
        </Box>
        <EmptyState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Box className="px-6 pb-2" style={{ paddingTop: insets.top + 16 }}>
          <HStack className="items-center justify-between mb-4">
            <VStack>
              <Text className="text-2xl font-bold text-gray-900">Your Cart</Text>
              <Text className="text-sm text-gray-500">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </Text>
            </VStack>
            
            <TouchableOpacity 
              onPress={clearItems}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
              }}
            >
              <Text className="text-red-600 font-semibold text-sm">Clear All</Text>
            </TouchableOpacity>
          </HStack>
        </Box>

        {/* Cart Items */}
        <Box className="px-4">
          {items.map((item, index) => (
            <React.Fragment key={item.product.id}>
              {renderItem({ item, index })}
            </React.Fragment>
          ))}
        </Box>

        {/* Order Summary Card */}
        <Box className="px-4 mt-4 mb-6">
          <Card style={{
            borderRadius: 20,
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <Box className="p-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">Order Summary</Text>
              
              <VStack style={{ gap: 12 }}>
                <HStack className="justify-between items-center">
                  <Text className="text-gray-600">Subtotal</Text>
                  <Text className="text-base font-semibold">₹{totalPrice.toLocaleString()}</Text>
                </HStack>
                <HStack className="justify-between items-center">
                  <Text className="text-gray-600">Shipping</Text>
                  {items.length > 0 ? (
                    <Text className="text-base font-semibold">
                      {shippingCost > 0 ? 
                        `₹${shippingCost.toFixed(2)}` : 
                        'Calculate below'
                      }
                    </Text>
                  ) : (
                    <Text className="text-base font-semibold text-green-600">Free</Text>
                  )}
                </HStack>
                <HStack className="justify-between items-center">
                  <Text className="text-gray-600">Tax</Text>
                  <Text className="text-base font-semibold">₹0</Text>
                </HStack>
                <Box className="h-px bg-gray-200" />
                <HStack className="justify-between items-center">
                  <Text className="text-lg font-bold text-gray-900">Total</Text>
                  <Text className="text-xl font-bold text-blue-600">
                    ₹{(totalPrice + shippingCost).toLocaleString()}
                  </Text>
                </HStack>
              </VStack>

              {/* Shipping Calculator */}
              {items.length > 0 && (
                <ShippingCalculator sourcePostcode="110001" />
              )}

              {/* Checkout Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#3B82F6',
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 20,
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                onPress={handleCheckout}
                disabled={items.length > 0 && shippingCost <= 0}
              >
                <HStack className="items-center" style={{ gap: 8 }}>
                  <Text className="text-white text-base font-bold">
                    {items.length > 0 && shippingCost <= 0 ? 
                      'Calculate Shipping First' : 
                      'Proceed to Checkout'
                    }
                  </Text>
                  <ShoppingCart size={18} color="#FFFFFF" />
                </HStack>
              </TouchableOpacity>
            </Box>
          </Card>
        </Box>

        {/* Bottom spacing for tab bar */}
        <Box style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  pincodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pincodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
  },
  pincodeButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pincodeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#007BFF',
    fontWeight: 'bold',
  }
});
