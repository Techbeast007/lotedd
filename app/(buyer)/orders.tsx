'use client';

import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import { CheckCircle, ChevronRight, Clock, Package, Truck } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Image, StatusBar, StyleSheet, TouchableOpacity } from 'react-native';

// Sample orders data
const orders = [
  {
    id: 'ORD123456',
    date: '8 June 2025',
    total: 560,
    items: 4,
    status: 'delivered',
    deliveredDate: '8 June 2025',
    trackingId: 'TRK789012',
    products: [
      {
        id: 1,
        name: 'Fresh Tomatoes',
        price: 40,
        quantity: '1 kg',
        image: 'https://images.unsplash.com/photo-1561136594-7f68413baa99?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 2,
        name: 'Fresh Spinach',
        price: 30,
        quantity: '500 g',
        image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      }
    ]
  },
  {
    id: 'ORD789012',
    date: '8 June 2025',
    total: 280,
    items: 2,
    status: 'in-transit',
    estimatedDelivery: '10 June 2025',
    trackingId: 'TRK345678',
    products: [
      {
        id: 3,
        name: 'Red Apples',
        price: 150,
        quantity: '1 kg',
        image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      }
    ]
  },
  {
    id: 'ORD345678',
    date: '7 June 2025',
    total: 420,
    items: 3,
    status: 'processing',
    estimatedDelivery: '11 June 2025',
    trackingId: 'TRK901234',
    products: [
      {
        id: 4,
        name: 'Organic Carrots',
        price: 60,
        quantity: '1 kg',
        image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5d4f7?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 5,
        name: 'Fresh Potatoes',
        price: 50,
        quantity: '2 kg',
        image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      }
    ]
  },
  {
    id: 'ORD901234',
    date: '5 June 2025',
    total: 385,
    items: 3,
    status: 'delivered',
    deliveredDate: '6 June 2025',
    trackingId: 'TRK567890',
    products: [
      {
        id: 6,
        name: 'Organic Onions',
        price: 35,
        quantity: '1 kg',
        image: 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
      }
    ]
  }
];

export default function OrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  
  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => {
        if (activeTab === 'active') {
          return order.status === 'processing' || order.status === 'in-transit';
        } else {
          return order.status === 'delivered';
        }
      });
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return '#10B981'; // green
      case 'in-transit':
        return '#3B82F6'; // blue
      case 'processing':
        return '#F59E0B'; // amber
      default:
        return '#6B7280'; // gray
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle size={16} color="#10B981" />;
      case 'in-transit':
        return <Truck size={16} color="#3B82F6" />;
      case 'processing':
        return <Clock size={16} color="#F59E0B" />;
      default:
        return <Package size={16} color="#6B7280" />;
    }
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'in-transit':
        return 'In Transit';
      case 'processing':
        return 'Processing';
      default:
        return 'Unknown';
    }
  };
  
  const renderOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push(`/order/${item.id}`)}
    >
      <HStack style={styles.orderHeader}>
        <VStack>
          <Text style={styles.orderID}>Order #{item.id}</Text>
          <Text style={styles.orderDate}>{item.date}</Text>
        </VStack>
        <HStack style={styles.statusContainer}>
          {getStatusIcon(item.status)}
          <Text 
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) }
            ]}
          >
            {getStatusText(item.status)}
          </Text>
        </HStack>
      </HStack>
      
      <Box style={styles.divider} />
      
      <HStack style={styles.productsPreview}>
        <HStack style={styles.imageStack}>
          {item.products.slice(0, 3).map((product, index) => (
            <Image 
              key={product.id} 
              source={{ uri: product.image }}
              style={[
                styles.productThumb,
                { left: index * 20 }
              ]}
            />
          ))}
          {item.products.length > 3 && (
            <Box style={[styles.productThumb, { left: 3 * 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>+{item.products.length - 3}</Text>
            </Box>
          )}
        </HStack>
        
        <HStack style={styles.orderInfo}>
          <VStack>
            <Text style={styles.orderItems}>{item.items} Items</Text>
            <Text style={styles.orderTotal}>₹{item.total}</Text>
          </VStack>
          <ChevronRight size={20} color="#9CA3AF" />
        </HStack>
      </HStack>
    </TouchableOpacity>
  );

  return (
    <Box style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <Box style={styles.header}>
        <Heading style={styles.title}>My Orders</Heading>
        
        {/* Tabs */}
        <HStack style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' ? styles.activeTab : null]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' ? styles.activeTabText : null]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' ? styles.activeTab : null]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' ? styles.activeTabText : null]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' ? styles.activeTab : null]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' ? styles.activeTabText : null]}>
              Completed
            </Text>
          </TouchableOpacity>
        </HStack>
      </Box>
      
      {filteredOrders.length > 0 ? (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.orderList}
        />
      ) : (
        <VStack style={styles.emptyContainer}>
          <Package size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.emptyText}>Your {activeTab} orders will appear here</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/home')}
          >
            <Text style={styles.shopButtonText}>Shop Now</Text>
          </TouchableOpacity>
        </VStack>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingBottom: 0,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  orderList: {
    padding: 16,
    paddingBottom: 90,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderID: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  productsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageStack: {
    flexDirection: 'row',
    position: 'relative',
    height: 40,
    width: 120,
  },
  productThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderItems: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    color: '#1F2937',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  shopButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  shopButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});