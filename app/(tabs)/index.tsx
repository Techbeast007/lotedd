import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import { AlertTriangle, DollarSign, PackageCheck, PlusCircle, ShoppingBag, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, RefreshControl, StatusBar, StyleSheet } from 'react-native';

export default function SellerDashboard() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 24,
    lowStockProducts: 5,
    newOrders: 3,
    pendingDeliveries: 7,
    recentSales: 2500,
    currentMonthSales: 12450
  });
  const [userName, setUserName] = useState('Seller');
  
  useEffect(() => {
    // Simulate loading user data from AsyncStorage/firestore
    const loadUserData = async () => {
      try {
        // In a real app, you would fetch actual dashboard data here
        // For example:
        // const user = await fetchUserProfile();
        // setUserName(user.firstName || 'Seller');
        // const dashboardStats = await fetchDashboardStats();
        // setDashboardData(dashboardStats);
        
        // For now we'll just simulate a delay and use the fake data
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading user data:', error);
        setLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refreshing data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Sample data for alerts section
  const alerts = [
    {
      id: 1,
      type: 'lowStock',
      title: 'Low Stock Alert',
      message: '5 products need to be restocked soon',
      icon: <AlertTriangle size={20} color="#FF9800" />,
      color: '#FFF8E1',
      textColor: '#FF9800',
      action: () => router.push('/editProduct')
    },
    {
      id: 2,
      type: 'newOrders',
      title: 'New Orders',
      message: '3 new orders need your attention',
      icon: <ShoppingBag size={20} color="#4CAF50" />,
      color: '#E8F5E9',
      textColor: '#4CAF50',
      action: () => console.log('Navigate to orders')
    },
    {
      id: 3,
      type: 'delivery',
      title: 'Pending Deliveries',
      message: '7 orders are out for delivery',
      icon: <PackageCheck size={20} color="#2196F3" />,
      color: '#E3F2FD',
      textColor: '#2196F3',
      action: () => console.log('Navigate to deliveries')
    }
  ];

  // Sample data for recent activities
  const recentActivities = [
    {
      id: 1,
      action: 'Order Received',
      description: 'Order #1234 for 3 items (₹1,250)',
      time: '10 minutes ago'
    },
    {
      id: 2,
      action: 'Product Updated',
      description: 'Updated stock quantity for "Organic Tomatoes"',
      time: '2 hours ago'
    },
    {
      id: 3,
      action: 'Order Delivered',
      description: 'Order #1230 was successfully delivered',
      time: '5 hours ago'
    },
    {
      id: 4,
      action: 'Payment Received',
      description: 'Payment for Order #1228 (₹750) received',
      time: 'Yesterday'
    }
  ];

  const StatCard = ({ title, value, icon, bgColor }) => (
    <Card style={[styles.statCard, { backgroundColor: bgColor }]}>
      <HStack style={styles.statCardHeader}>
        <Text style={styles.statCardTitle}>{title}</Text>
        <Box style={styles.iconContainer}>
          {icon}
        </Box>
      </HStack>
      <Text style={styles.statCardValue}>{value}</Text>
    </Card>
  );

  return (
    <Box style={styles.container}>
      {/* Fixed header outside of ScrollView */}
      <Box style={styles.header}>
        <VStack>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.nameText}>{userName}</Text>
        </VStack>
        <Button 
          variant="outline" 
          style={styles.profileButton} 
          onPress={() => router.push('/profilesection')}
        >
          <ButtonText style={styles.profileButtonText}>View Profile</ButtonText>
        </Button>
      </Box>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats overview cards */}
        <Box style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <HStack style={styles.statsContainer}>
            <StatCard 
              title="Total Products" 
              value={dashboardData.totalProducts} 
              icon={<ShoppingBag size={18} color="#4F46E5" />}
              bgColor="#F5F3FF"
            />
            <StatCard 
              title="Sales This Month" 
              value={`₹${dashboardData.currentMonthSales}`} 
              icon={<TrendingUp size={18} color="#10B981" />}
              bgColor="#ECFDF5"
            />
          </HStack>
          <HStack style={styles.statsContainer}>
            <StatCard 
              title="Low Stock Items" 
              value={dashboardData.lowStockProducts} 
              icon={<AlertTriangle size={18} color="#F59E0B" />}
              bgColor="#FFFBEB"
            />
            <StatCard 
              title="New Orders" 
              value={dashboardData.newOrders} 
              icon={<DollarSign size={18} color="#EF4444" />}
              bgColor="#FEF2F2"
            />
          </HStack>
        </Box>

        {/* Alerts section */}
        <Box style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts & Notifications</Text>
          <VStack style={styles.alertsContainer}>
            {alerts.map((alert) => (
              <Pressable key={alert.id} onPress={alert.action}>
                <Box 
                  style={[
                    styles.alertItem, 
                    { backgroundColor: alert.color }
                  ]}
                >
                  <HStack style={styles.alertContent}>
                    <Box style={styles.alertIcon}>
                      {alert.icon}
                    </Box>
                    <VStack style={styles.alertTextContainer}>
                      <Text style={[styles.alertTitle, { color: alert.textColor }]}>
                        {alert.title}
                      </Text>
                      <Text style={styles.alertMessage}>
                        {alert.message}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </Pressable>
            ))}
          </VStack>
        </Box>

        {/* Quick Actions Section */}
        <Box style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Card style={styles.quickActionsCard}>
            <VStack>
              <Pressable style={styles.actionButton} onPress={() => router.push('/productadd')}>
                <HStack style={styles.actionButtonContent}>
                  <PlusCircle size={20} color="#3B82F6" />
                  <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Add New Product</Text>
                </HStack>
              </Pressable>
              
              <Pressable style={[styles.actionButton, { backgroundColor: '#FFFBEB' }]} onPress={() => router.push('/editProduct')}>
                <HStack style={styles.actionButtonContent}>
                  <AlertTriangle size={20} color="#F59E0B" />
                  <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Manage Inventory</Text>
                </HStack>
              </Pressable>
              
              <Pressable style={[styles.actionButton, { backgroundColor: '#ECFDF5' }]}>
                <HStack style={styles.actionButtonContent}>
                  <ShoppingBag size={20} color="#10B981" />
                  <Text style={[styles.actionButtonText, { color: '#10B981' }]}>View Orders</Text>
                </HStack>
              </Pressable>
            </VStack>
          </Card>
        </Box>

        {/* Recent activity section */}
        <Box style={[styles.section, { marginBottom: 80 }]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Card style={styles.recentActivityCard}>
            {recentActivities.map((activity, index) => (
              <Box 
                key={activity.id} 
                style={[
                  styles.activityItem,
                  index < recentActivities.length - 1 && styles.activityDivider
                ]}
              >
                <Text style={styles.activityAction}>{activity.action}</Text>
                <Text style={styles.activityDesc}>{activity.description}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </Box>
            ))}
          </Card>
        </Box>
      </ScrollView>

      {/* Floating Action Button */}
      <Box style={styles.fabContainer}>
        <Button 
          style={styles.fab}
          onPress={() => router.push('/productadd')}
        >
          <ButtonText style={styles.fabText}>+</ButtonText>
        </Button>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0, // Remove top padding since header is fixed now
  },
  header: {
    backgroundColor: '#3B82F6',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 16,
    zIndex: 10,
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  nameText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 0,
    borderRadius: 20,
  },
  profileButtonText: {
    color: 'white',
    fontSize: 12,
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
  },
  statCardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardTitle: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  statCardValue: {
    color: '#111827',
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconContainer: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertsContainer: {
    gap: 8,
  },
  alertItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  alertContent: {
    alignItems: 'center',
  },
  alertIcon: {
    marginRight: 12,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontWeight: 'bold',
  },
  alertMessage: {
    color: '#4B5563',
    fontSize: 13,
  },
  quickActionsCard: {
    backgroundColor: 'white',
    padding: 12,
  },
  actionButton: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonContent: {
    alignItems: 'center',
  },
  actionButtonText: {
    marginLeft: 12,
    fontWeight: '500',
  },
  recentActivityCard: {
    backgroundColor: 'white',
    padding: 12,
  },
  activityItem: {
    paddingVertical: 12,
  },
  activityDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityAction: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  activityDesc: {
    color: '#4B5563',
    fontSize: 14,
  },
  activityTime: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 10,
  },
  fab: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  fabText: {
    fontSize: 24,
    color: 'white',
  },
});
