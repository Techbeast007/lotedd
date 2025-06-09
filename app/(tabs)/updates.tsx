import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowRight, Bell, Package, ShoppingBag } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, RefreshControl, StatusBar, StyleSheet } from 'react-native';

export default function SellerUpdatesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Sample product data that needs restocking
  const lowStockProducts = [
    {
      id: 1,
      name: 'Organic Tomatoes',
      currentStock: 5,
      minStockLevel: 10,
      image: 'https://images.unsplash.com/photo-1561136594-7f68413baa99?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 2,
      name: 'Fresh Spinach',
      currentStock: 3,
      minStockLevel: 15,
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 3,
      name: 'Red Apples',
      currentStock: 8,
      minStockLevel: 20,
      image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80'
    }
  ];

  // Sample new order data
  const newOrders = [
    {
      id: 'ORD-2023-001',
      customer: 'John Doe',
      items: 3,
      total: 750,
      time: '10 minutes ago',
      status: 'New'
    },
    {
      id: 'ORD-2023-002',
      customer: 'Sarah Smith',
      items: 5,
      total: 1200,
      time: '25 minutes ago',
      status: 'New'
    },
    {
      id: 'ORD-2023-003',
      customer: 'Mike Johnson',
      items: 2,
      total: 450,
      time: '1 hour ago',
      status: 'Processing'
    }
  ];

  // Sample delivery updates
  const deliveryUpdates = [
    {
      id: 'DEL-2023-001',
      orderId: 'ORD-2023-000',
      customer: 'Priya Sharma',
      status: 'Out for Delivery',
      expectedDelivery: 'Today by 2 PM'
    },
    {
      id: 'DEL-2023-002',
      orderId: 'ORD-2023-001',
      customer: 'Raj Patel',
      status: 'Delivered',
      deliveredAt: '1 hour ago'
    }
  ];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refreshing data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <Box style={styles.container}>
      {/* Header */}
      <Box style={styles.header}>
        <HStack style={styles.headerContent}>
          <Text style={styles.headerTitle}>Updates & Notifications</Text>
          <Box style={styles.iconContainer}>
            <Bell size={20} color="#3B82F6" />
            <Box style={styles.notificationBadge}>
              <Text style={styles.badgeText}>{lowStockProducts.length + newOrders.filter(o => o.status === 'New').length}</Text>
            </Box>
          </Box>
        </HStack>
      </Box>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Low Stock Alerts */}
        <Box style={styles.section}>
          <HStack style={styles.sectionHeaderModern}>
            <HStack style={styles.sectionTitleContainer}>
              <Box style={styles.iconBackgroundLowStock}>
                <AlertTriangle size={18} color="#F59E0B" />
              </Box>
              <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
            </HStack>
            <Text style={styles.sectionCount}>{lowStockProducts.length}</Text>
          </HStack>

          <Card style={styles.cardModern}>
            {lowStockProducts.map((product, index) => (
              <React.Fragment key={product.id}>
                <HStack style={styles.productItemModern}>
                  <Image
                    source={{ uri: product.image }}
                    style={styles.productImageModern}
                    alt={product.name}
                  />
                  <VStack style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.stockInfo}>
                      Current Stock: <Text style={styles.lowStockText}>{product.currentStock}</Text> / Min: {product.minStockLevel}
                    </Text>
                  </VStack>
                  <Button 
                    variant="outline"
                    size="sm"
                    style={styles.actionButtonModern}
                    onPress={() => router.push('/editProduct')}
                  >
                    <ButtonText style={styles.actionButtonText}>Restock</ButtonText>
                  </Button>
                </HStack>
                {index < lowStockProducts.length - 1 && <Divider style={styles.dividerModern} />}
              </React.Fragment>
            ))}

            <Button 
              variant="ghost" 
              style={styles.viewAllButtonModern}
              onPress={() => router.push('/editProduct')}
            >
              <HStack style={styles.viewAllButtonContent}>
                <ButtonText style={styles.viewAllButtonText}>View All Inventory</ButtonText>
                <ArrowRight size={16} color="#3B82F6" />
              </HStack>
            </Button>
          </Card>
        </Box>

        {/* New Orders */}
        <Box style={styles.section}>
          <HStack style={styles.sectionHeaderModern}>
            <HStack style={styles.sectionTitleContainer}>
              <Box style={styles.iconBackgroundOrders}>
                <ShoppingBag size={18} color="#10B981" />
              </Box>
              <Text style={styles.sectionTitle}>New Orders</Text>
            </HStack>
            <Text style={styles.sectionCount}>{newOrders.filter(o => o.status === 'New').length}</Text>
          </HStack>

          <Card style={styles.cardModern}>
            {newOrders.map((order, index) => (
              <React.Fragment key={order.id}>
                <HStack style={styles.orderItemModern}>
                  <Box
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: order.status === 'New' ? '#10B981' : '#6366F1' }
                    ]}
                  />
                  <VStack style={styles.orderInfo}>
                    <HStack style={styles.orderHeader}>
                      <Text style={styles.orderId}>{order.id}</Text>
                      <Text style={[
                        styles.orderStatus,
                        {
                          color: order.status === 'New' ? '#10B981' : '#6366F1',
                          backgroundColor: order.status === 'New' ? '#ECFDF5' : '#EEF2FF'
                        }
                      ]}>
                        {order.status}
                      </Text>
                    </HStack>
                    <HStack style={styles.orderCustomerRow}>
                      <Box style={styles.avatarCircleModern}>
                        <Text style={styles.avatarText}>{order.customer[0]}</Text>
                      </Box>
                      <Text style={styles.orderCustomer}>{order.customer}</Text>
                    </HStack>
                    <HStack style={styles.orderDetails}>
                      <Text style={styles.orderItemCount}>{order.items} items</Text>
                      <Text style={styles.orderTotal}>₹{order.total}</Text>
                      <Text style={styles.orderTime}>{order.time}</Text>
                    </HStack>
                  </VStack>
                  <Button 
                    variant="solid"
                    size="sm"
                    style={[
                      styles.orderActionButtonModern,
                      { backgroundColor: order.status === 'New' ? '#10B981' : '#6366F1' }
                    ]}
                    onPress={() => console.log(`Process order ${order.id}`)}
                  >
                    <ButtonText style={styles.orderActionButtonText}>
                      {order.status === 'New' ? 'Process' : 'View'}
                    </ButtonText>
                  </Button>
                </HStack>
                {index < newOrders.length - 1 && <Divider style={styles.dividerModern} />}
              </React.Fragment>
            ))}

            <Button 
              variant="ghost" 
              style={styles.viewAllButtonModern}
              onPress={() => console.log('View all orders')}
            >
              <HStack style={styles.viewAllButtonContent}>
                <ButtonText style={styles.viewAllButtonText}>View All Orders</ButtonText>
                <ArrowRight size={16} color="#3B82F6" />
              </HStack>
            </Button>
          </Card>
        </Box>

        {/* Delivery Updates */}
        <Box style={[styles.section, { marginBottom: 20 }]}> 
          <HStack style={styles.sectionHeaderModern}>
            <HStack style={styles.sectionTitleContainer}>
              <Box style={styles.iconBackgroundDelivery}>
                <Package size={18} color="#6366F1" />
              </Box>
              <Text style={styles.sectionTitle}>Delivery Updates</Text>
            </HStack>
            <Text style={styles.sectionCount}>{deliveryUpdates.length}</Text>
          </HStack>

          <Card style={styles.cardModern}>
            {deliveryUpdates.map((delivery, index) => (
              <React.Fragment key={delivery.id}>
                <HStack style={styles.deliveryItemModern}>
                  <Box
                    style={[
                      styles.statusIndicator,
                      { 
                        backgroundColor: delivery.status === 'Delivered' 
                          ? '#10B981' 
                          : '#6366F1' 
                      }
                    ]}
                  />
                  <VStack style={styles.deliveryInfo}>
                    <HStack style={styles.deliveryHeader}>
                      <Text style={styles.deliveryId}>{delivery.orderId}</Text>
                      <Text style={[
                        styles.deliveryStatus,
                        {
                          color: delivery.status === 'Delivered' ? '#10B981' : '#6366F1',
                          backgroundColor: delivery.status === 'Delivered' ? '#ECFDF5' : '#EEF2FF'
                        }
                      ]}>
                        {delivery.status}
                      </Text>
                    </HStack>
                    <HStack style={styles.orderCustomerRow}>
                      <Box style={styles.avatarCircleModernDelivery}>
                        <Text style={styles.avatarText}>{delivery.customer[0]}</Text>
                      </Box>
                      <Text style={styles.deliveryCustomer}>{delivery.customer}</Text>
                    </HStack>
                    <Text style={styles.deliveryTimeInfo}>
                      {delivery.status === 'Delivered' 
                        ? `Delivered: ${delivery.deliveredAt}` 
                        : `Expected: ${delivery.expectedDelivery}`}
                    </Text>
                  </VStack>
                  <Button 
                    variant={delivery.status === 'Delivered' ? 'outline' : 'solid'}
                    size="sm"
                    style={[
                      styles.deliveryActionButtonModern,
                      { 
                        backgroundColor: delivery.status === 'Delivered' 
                          ? 'transparent' 
                          : '#6366F1',
                        borderColor: delivery.status === 'Delivered' 
                          ? '#6366F1' 
                          : 'transparent'
                      }
                    ]}
                    onPress={() => console.log(`Track delivery ${delivery.id}`)}
                  >
                    <ButtonText style={[
                      styles.deliveryActionButtonText,
                      { color: delivery.status === 'Delivered' ? '#6366F1' : 'white' }
                    ]}>
                      {delivery.status === 'Delivered' ? 'Details' : 'Track'}
                    </ButtonText>
                  </Button>
                </HStack>
                {index < deliveryUpdates.length - 1 && <Divider style={styles.dividerModern} />}
              </React.Fragment>
            ))}

            <Button 
              variant="ghost" 
              style={styles.viewAllButtonModern}
              onPress={() => console.log('View all deliveries')}
            >
              <HStack style={styles.viewAllButtonContent}>
                <ButtonText style={styles.viewAllButtonText}>View All Deliveries</ButtonText>
                <ArrowRight size={16} color="#3B82F6" />
              </HStack>
            </Button>
          </Card>
        </Box>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  headerContent: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  iconContainer: {
    position: 'relative',
    padding: 8,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    height: 16,
    width: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitleContainer: {
    alignItems: 'center',
    gap: 10,
  },
  iconBackgroundLowStock: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  cardModern: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 2,
    marginBottom: 2,
    overflow: 'hidden',
  },
  productItemModern: {
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 2,
    gap: 16,
  },
  productImageModern: {
    width: 54,
    height: 54,
    borderRadius: 12,
    marginRight: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    objectFit: 'cover',
    alignSelf: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  stockInfo: {
    fontSize: 14,
    color: '#6B7280',
  },
  lowStockText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  actionButtonModern: {
    borderColor: '#F59E0B',
    height: 40,
    minWidth: 80,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  dividerModern: {
    marginHorizontal: 0,
    backgroundColor: '#F3F4F6',
    height: 1,
  },
  viewAllButtonModern: {
    justifyContent: 'center',
    height: 56,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  viewAllButtonContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  viewAllButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  orderItemModern: {
    padding: 18,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 2,
    gap: 16,
  },
  orderInfo: {
    flex: 1,
    marginLeft: 6,
  },
  statusIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontWeight: '600',
    color: '#1F2937',
  },
  orderStatus: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  orderCustomer: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 4,
  },
  orderCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarCircleModern: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    alignSelf: 'center',
  },
  avatarCircleModernDelivery: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    alignSelf: 'center',
  },
  avatarText: {
    color: '#1F2937',
    fontWeight: 'bold',
    fontSize: 15,
  },
  orderDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  orderItemCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  orderTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderTime: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  orderActionButtonModern: {
    marginLeft: 12,
    minWidth: 80,
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  deliveryItemModern: {
    padding: 18,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 2,
    gap: 16,
  },
  deliveryInfo: {
    flex: 1,
    marginLeft: 6,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deliveryId: {
    fontWeight: '600',
    color: '#1F2937',
  },
  deliveryStatus: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deliveryCustomer: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 4,
  },
  deliveryTimeInfo: {
    fontSize: 13,
    color: '#6B7280',
  },
  deliveryActionButtonModern: {
    marginLeft: 12,
    minWidth: 80,
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    borderRadius: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
});