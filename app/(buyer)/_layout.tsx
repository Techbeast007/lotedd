import { Tabs } from 'expo-router';
import { Home, Search, ShoppingBag, ShoppingCart, User } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function BuyerTabLayout() {
  const colorScheme = useColorScheme();
  
  // Memoize tab bar icons to prevent unnecessary re-renders
  const renderIcon = useMemo(() => ({
    home: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}20` : 'transparent',
        padding: 10,
        borderRadius: 20,
      }}>
        <Home size={24} color={color} />
      </View>
    ),
    shop: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}20` : 'transparent',
        padding: 10,
        borderRadius: 20,
      }}>
        <Search size={24} color={color} />
      </View>
    ),
    orders: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}20` : 'transparent',
        padding: 10,
        borderRadius: 20,
      }}>
        <ShoppingBag size={24} color={color} />
      </View>
    ),
    cart: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}20` : 'transparent',
        padding: 10,
        borderRadius: 20,
      }}>
        <ShoppingCart size={24} color={color} />
      </View>
    ),
    profile: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}20` : 'transparent',
        padding: 10,
        borderRadius: 20,
      }}>
        <User size={24} color={color} />
      </View>
    )
  }), []);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors[colorScheme]?.background,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 8,
        },
        header: () => null,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 10,
        },
        tabBarItemStyle: {
          height: '100%',
        },
        // Performance optimizations
        freezeOnBlur: true,
        lazy: true,
      }}
      initialRouteName="home"
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => renderIcon.home(color, focused),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, focused }) => renderIcon.shop(color, focused),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => renderIcon.orders(color, focused),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => renderIcon.cart(color, focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => renderIcon.profile(color, focused),
        }}
      />
    </Tabs>
  );
}