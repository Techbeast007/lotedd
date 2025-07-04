'use client';

import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'bank';
  name: string;
  cardNumber?: string;
  expiryDate?: string;
  isDefault: boolean;
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  
  // Dummy payment methods data
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      name: 'Visa ending in 4242',
      cardNumber: '•••• •••• •••• 4242',
      expiryDate: '12/25',
      isDefault: true,
    },
    {
      id: '2',
      type: 'card',
      name: 'Mastercard ending in 5555',
      cardNumber: '•••• •••• •••• 5555',
      expiryDate: '10/24',
      isDefault: false,
    },
  ]);

  const handleAddPaymentMethod = () => {
    // This would normally navigate to a payment method entry screen
    Alert.alert(
      'Add Payment Method',
      'This is a placeholder. In a real app, this would open a payment method entry form.',
      [{ text: 'OK' }]
    );
  };

  const handleRemovePaymentMethod = (id: string) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(methods => methods.filter(method => method.id !== id));
          },
        },
      ]
    );
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(methods =>
      methods.map(method => ({
        ...method,
        isDefault: method.id === id,
      }))
    );
  };

  const renderPaymentMethod = ({ item }: { item: PaymentMethod }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.cardTypeContainer}>
          <CreditCard size={20} color="#3B82F6" />
          <Text style={styles.cardName}>{item.name}</Text>
        </View>
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Default</Text>
          </View>
        )}
      </View>

      {item.cardNumber && (
        <View style={styles.cardDetails}>
          <Text style={styles.cardNumber}>{item.cardNumber}</Text>
          {item.expiryDate && <Text style={styles.expiryDate}>Expires {item.expiryDate}</Text>}
        </View>
      )}

      <View style={styles.actionButtons}>
        {!item.isDefault && (
          <TouchableOpacity
            style={styles.setDefaultButton}
            onPress={() => handleSetDefault(item.id)}
          >
            <Text style={styles.setDefaultText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemovePaymentMethod(item.id)}
        >
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Heading style={styles.headerTitle}>Payment Methods</Heading>
        <View style={styles.placeholder} />
      </View>

      <Box style={styles.content}>
        {paymentMethods.length > 0 ? (
          <FlatList
            data={paymentMethods}
            renderItem={renderPaymentMethod}
            keyExtractor={item => item.id}
          />
        ) : (
          <View style={styles.emptyState}>
            <CreditCard size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptyText}>Add a payment method for faster checkout</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={handleAddPaymentMethod}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Payment Method</Text>
        </TouchableOpacity>

        <Text style={styles.securityNote}>
          Your payment information is securely stored and processed in accordance with PCI DSS standards.
        </Text>
      </Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 10,
  },
  defaultBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '500',
  },
  cardDetails: {
    marginBottom: 12,
  },
  cardNumber: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 4,
  },
  expiryDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  setDefaultButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    marginRight: 12,
  },
  setDefaultText: {
    color: '#3B82F6',
    fontWeight: '500',
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#1E293B',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  securityNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
});
