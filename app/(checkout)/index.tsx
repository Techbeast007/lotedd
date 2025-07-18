import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { ArrowLeft, Briefcase, Check, CreditCard, Home, MapPin, ShoppingBag } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';

import { getCurrentUser } from '@/services/authService';
import { useCart } from '@/services/context/CartContext';
import {
    createOrder,
    handleRazorpaySuccess,
    initializeRazorpayPayment
} from '@/services/paymentService';

// Address interface matching the one from addresses.tsx
interface Address {
  id: string;
  label: string;
  type: 'home' | 'work' | 'other';
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
  phone?: string;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { items, totalPrice, itemCount } = useCart();
  
  // Direct state management for payments
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  
  // Mounted ref to prevent state updates after component unmounts
  const isMountedRef = React.useRef(true);
  
  // Cleanup function to prevent memory leaks and state updates after unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Fetch user addresses from Firebase
  useEffect(() => {
    const fetchUserAddresses = async () => {
      // Prevent fetch if component unmounted
      if (!isMountedRef.current) return;
      
      try {
        const user = getCurrentUser();
        if (!user) {
          console.log('No user logged in');
          if (isMountedRef.current) setIsLoadingAddresses(false);
          return;
        }

        if (isMountedRef.current) setIsLoadingAddresses(true);
        
        // Get user addresses from Firestore
        const addressesSnapshot = await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('addresses')
          .get();
          
        const userAddresses: Address[] = [];
        addressesSnapshot.forEach(doc => {
          userAddresses.push({
            id: doc.id,
            ...doc.data() as Omit<Address, 'id'>
          });
        });
        
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setAddresses(userAddresses);
          
          // Set default address
          const defaultAddress = userAddresses.find(addr => addr.isDefault);
          if (defaultAddress) {
            setSelectedAddress(defaultAddress);
          } else if (userAddresses.length > 0) {
            setSelectedAddress(userAddresses[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching user addresses:', error);
      } finally {
        if (isMountedRef.current) {
          setIsLoadingAddresses(false);
        }
      }
    };
    
    fetchUserAddresses();
  }, []);

  // Format the total price with Indian currency
  const formattedTotal = totalPrice.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Format the 50% advance payment
  const advancePayment = Math.ceil(totalPrice * 0.5);
  const formattedAdvance = advancePayment.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Format the remaining payment
  const remainingPayment = totalPrice - advancePayment;
  const formattedRemaining = remainingPayment.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Handle payment process - direct implementation without hook
  const handlePayment = async () => {
    if (!selectedAddress) {
      toast.show({
        render: () => (
          <Toast action="error">
            <VStack space="xs">
              <ToastTitle>Address Required</ToastTitle>
              <ToastDescription>Please select a delivery address</ToastDescription>
            </VStack>
          </Toast>
        )
      });
      return;
    }

    // Check if user is logged in
    const user = getCurrentUser();
    if (!user) {
      router.push('/(auth)');
      return;
    }

    try {
      if (isMountedRef.current) setIsProcessing(true);

      // Create an order
      const order = await createOrder(items, totalPrice, false, undefined, undefined, selectedAddress);
      if (!isMountedRef.current) return; // Stop if component unmounted

      // Get Razorpay options
      const options = await initializeRazorpayPayment(order);
      if (!isMountedRef.current) return; // Stop if component unmounted

      // Open Razorpay checkout
      const data = await RazorpayCheckout.open(options);
      if (!isMountedRef.current) return; // Stop if component unmounted

      // Handle successful payment
      const result = await handleRazorpaySuccess(order.id as string, data);

      if (isMountedRef.current) {
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

        // Navigate to orders screen
        router.push('/(buyer)/orders');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      
      if (isMountedRef.current) {
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
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  };

  // Helper function to render address type icon
  const renderAddressIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home size={20} color="#4F46E5" />;
      case 'work':
        return <Briefcase size={20} color="#4F46E5" />;
      default:
        return <MapPin size={20} color="#4F46E5" />;
    }
  };

  if (items.length === 0) {
    router.replace('/(buyer)/cart');
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Box style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <Box style={{ width: 24 }} />
      </Box>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shipping Address */}
        <Card style={styles.section}>
          <HStack style={styles.sectionHeader}>
            <MapPin size={20} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Shipping Address</Text>
          </HStack>

          {isLoadingAddresses ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.loadingText}>Loading addresses...</Text>
            </View>
          ) : addresses.length > 0 ? (
            addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.addressCard,
                  selectedAddress?.id === address.id && styles.selectedAddress,
                ]}
                onPress={() => setSelectedAddress(address)}
              >
                <HStack style={{ alignItems: 'flex-start' }}>
                  <Box style={styles.addressIconContainer}>
                    {renderAddressIcon(address.type)}
                  </Box>
                  <VStack style={{ flex: 1, marginLeft: 12 }}>
                    <HStack style={{ justifyContent: 'space-between' }}>
                      <Text style={styles.addressName}>{address.label || `${address.type.charAt(0).toUpperCase() + address.type.slice(1)} Address`}</Text>
                      {address.isDefault && (
                        <Badge size="sm" variant="outline" borderRadius="$full" action="muted">
                          <BadgeText>Default</BadgeText>
                        </Badge>
                      )}
                    </HStack>
                    <Text style={styles.addressText}>{address.addressLine1}</Text>
                    {address.addressLine2 && <Text style={styles.addressText}>{address.addressLine2}</Text>}
                    <Text style={styles.addressText}>
                      {address.city}, {address.state} {address.postalCode}
                    </Text>
                    <Text style={styles.addressText}>{address.country}</Text>
                    {address.phone && <Text style={styles.addressPhone}>{address.phone}</Text>}
                  </VStack>

                  {selectedAddress?.id === address.id && (
                    <Box style={styles.checkmark}>
                      <Check size={16} color="#FFFFFF" />
                    </Box>
                  )}
                </HStack>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noAddressContainer}>
              <Text style={styles.noAddressText}>
                You don't have any saved addresses.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addAddressButton}
            onPress={() => router.push('/settings/addresses')}
          >
            <Text style={styles.addAddressText}>+ Add New Address</Text>
          </TouchableOpacity>
        </Card>

        {/* Order Summary */}
        <Card style={styles.section}>
          <HStack style={styles.sectionHeader}>
            <ShoppingBag size={20} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </HStack>

          {/* Items count */}
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          </HStack>

          {/* Subtotal */}
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formattedTotal}</Text>
          </HStack>

          {/* Shipping */}
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={[styles.summaryValue, styles.freeShipping]}>Free</Text>
          </HStack>

          {/* Tax */}
          <HStack style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>₹0</Text>
          </HStack>

          <Divider my="$2" />

          {/* Total */}
          <HStack style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formattedTotal}</Text>
          </HStack>

          {/* Payment breakdown */}
          <VStack style={styles.paymentBreakdown}>
            <Text style={styles.paymentBreakdownTitle}>Payment Breakdown</Text>
            <HStack style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Advance Payment (50%)</Text>
              <Text style={styles.highlightedValue}>{formattedAdvance}</Text>
            </HStack>
            <HStack style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remaining Payment</Text>
              <Text style={styles.summaryValue}>{formattedRemaining}</Text>
            </HStack>
            <Text style={styles.paymentNote}>
              You'll pay 50% now and the remaining 50% upon delivery.
            </Text>
          </VStack>
        </Card>

        {/* Payment Method */}
        <Card style={styles.section}>
          <HStack style={styles.sectionHeader}>
            <CreditCard size={20} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </HStack>

          <HStack style={styles.paymentMethod}>
            <Box style={styles.razorpayLogo}>
              <Text style={styles.razorpayText}>Razorpay</Text>
            </Box>
            <Text style={styles.paymentMethodText}>
              Pay securely via Razorpay using UPI, Credit/Debit Card, Net Banking, etc.
            </Text>
          </HStack>
        </Card>

        {/* Bottom spacing */}
        <Box style={{ height: 100 }} />
      </ScrollView>

      {/* Checkout Button */}
      <Box style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <HStack style={styles.totalContainer}>
          <VStack>
            <Text style={styles.payNowText}>Pay now</Text>
            <Text style={styles.payNowAmount}>{formattedAdvance}</Text>
          </VStack>
          <Button
            size="lg"
            style={styles.checkoutButton}
            onPress={handlePayment}
            disabled={isProcessing || !selectedAddress}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ButtonText>Pay Now</ButtonText>
            )}
          </Button>
        </HStack>
      </Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  addressCard: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  selectedAddress: {
    borderColor: '#4F46E5',
    backgroundColor: '#F5F3FF',
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 14,
    color: '#334155',
    marginTop: 4,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAddressButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: 8,
    marginTop: 8,
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  freeShipping: {
    color: '#10B981',
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 4,
    marginBottom: 0,
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
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  paymentBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  highlightedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  paymentNote: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  razorpayLogo: {
    width: 80,
    height: 36,
    backgroundColor: '#3395FF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  razorpayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  paymentMethodText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payNowText: {
    fontSize: 12,
    color: '#64748B',
  },
  payNowAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  checkoutButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    color: '#6B7280',
  },
  noAddressContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noAddressText: {
    color: '#6B7280',
    marginBottom: 8,
  },
  addressIconContainer: {
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 8,
    marginRight: 12,
  },
});