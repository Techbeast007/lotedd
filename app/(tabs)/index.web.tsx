import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import StickyAddProductButton from '@/components/StickyAddProductButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
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


export default function HomeScreen() {
  const router = useRouter();
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
    // Simulate loading user data from localStorage/firestore
    const loadUserData = async () => {
      try {
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          if (userData.name) {
            setUserName(userData.name.split(' ')[0]);
          }
        }
        
        // In a real app, you would fetch actual dashboard data here
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
    <Card className="flex-1 p-4 mx-2" style={{ backgroundColor: bgColor }}>
      <HStack className="items-center justify-between mb-2">
        <Text className="text-gray-600 font-medium text-sm">{title}</Text>
        <Box className="h-8 w-8 rounded-full items-center justify-center bg-white/80">
          {icon}
        </Box>
      </HStack>
      <Text className="text-gray-900 text-xl font-bold">{value}</Text>
    </Card>
  );

  return (
    <>
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
       
    </ParallaxScrollView>
    <Box className='absolute bottom-5 right-5'>
      <StickyAddProductButton />
    </Box>
    <Box className="flex-1 bg-gray-50">
      <ScrollView>
        {/* Header section with greeting */}
        <Box className="bg-blue-600 py-8 px-6 rounded-b-3xl">
          <HStack className="max-w-6xl mx-auto w-full items-center justify-between">
            <VStack>
              <Text className="text-blue-100 text-base">Welcome back,</Text>
              <Text className="text-white text-3xl font-bold">{userName}</Text>
            </VStack>
            <Button className="px-4 py-1 h-10 bg-white/20 rounded-full">
              <ButtonText className="text-white text-sm">View Profile</ButtonText>
            </Button>
          </HStack>
        </Box>
        
        <Box className="max-w-6xl mx-auto w-full px-6">
          {/* Stats overview cards */}
          <Box className="mt-8">
            <Text className="text-xl font-bold mb-4">Overview</Text>
            <Box className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            </Box>
          </Box>

          {/* Flexible grid layout for smaller and larger screens */}
          <Box className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alerts section */}
            <Box className="lg:col-span-2">
              <Text className="text-xl font-bold mb-4">Alerts & Notifications</Text>
              <VStack className="space-y-3">
                {alerts.map((alert) => (
                  <Pressable key={alert.id} onPress={alert.action}>
                    <Box 
                      className="p-4 rounded-xl border border-gray-100" 
                      style={{ backgroundColor: alert.color }}
                    >
                      <HStack className="items-center">
                        <Box className="mr-3">
                          {alert.icon}
                        </Box>
                        <VStack className="flex-1">
                          <Text className="font-bold" style={{ color: alert.textColor }}>
                            {alert.title}
                          </Text>
                          <Text className="text-gray-700 text-sm">
                            {alert.message}
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  </Pressable>
                ))}
              </VStack>
            </Box>

            {/* Quick Actions Card */}
            <Box>
              <Text className="text-xl font-bold mb-4">Quick Actions</Text>
              <Card className="p-4 bg-white">
                <VStack className="space-y-3">
                  <Pressable onPress={() => router.push('/productadd')}>
                    <HStack className="items-center p-3 bg-blue-50 rounded-lg">
                      <PlusCircle size={20} color="#3B82F6" className="mr-3" />
                      <Text className="text-blue-700 font-medium">Add New Product</Text>
                    </HStack>
                  </Pressable>
                  <Pressable onPress={() => router.push('/editProduct')}>
                    <HStack className="items-center p-3 bg-amber-50 rounded-lg">
                      <AlertTriangle size={20} color="#F59E0B" className="mr-3" />
                      <Text className="text-amber-700 font-medium">Manage Inventory</Text>
                    </HStack>
                  </Pressable>
                  <Pressable>
                    <HStack className="items-center p-3 bg-green-50 rounded-lg">
                      <ShoppingBag size={20} color="#10B981" className="mr-3" />
                      <Text className="text-green-700 font-medium">View Orders</Text>
                    </HStack>
                  </Pressable>
                </VStack>
              </Card>
            </Box>
          </Box>

          {/* Recent activity section */}
          <Box className="mt-8 mb-16">
            <Text className="text-xl font-bold mb-4">Recent Activity</Text>
            <Card className="bg-white p-4 rounded-xl border border-gray-100">
              {recentActivities.map((activity) => (
                <Box key={activity.id} className="py-3 border-b border-gray-100">
                  <Text className="font-bold text-gray-800">{activity.action}</Text>
                  <Text className="text-gray-600 text-sm">{activity.description}</Text>
                  <Text className="text-gray-400 text-xs mt-1">{activity.time}</Text>
                </Box>
              ))}
            </Card>
          </Box>

          {/* Add Product Button for Web */}
          <Box className="fixed bottom-6 right-6 z-10">
            <Button 
              className="h-14 w-14 rounded-full bg-blue-600 shadow-lg"
              onPress={() => router.push('/productadd')}
            >
              <ButtonText className="text-2xl text-white">+</ButtonText>
            </Button>
          </Box>
        </Box>
      </ScrollView>
    </Box>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
