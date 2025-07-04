import { Tabs } from 'expo-router';
import { Gavel, Heart, Home, Search, ShoppingBag, ShoppingCart, User } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const styles = StyleSheet.create({
  header: {
    height: 58,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 0.6,
    fontStyle: 'italic',
    textTransform: 'lowercase',
  },
  logoAccent: {
    color: '#7C3AED',
    fontWeight: '900',
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginLeft: 2,
    marginRight: 2,
  },
  headerTrade: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    position: 'relative',
    top: -8,
    right: -2,
  },
});

export default function BuyerTabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  
  // Memoize tab bar icons to prevent unnecessary re-renders
  const renderIcon = useMemo(() => ({
    home: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}15` : 'transparent',
        padding: 9,
        borderRadius: 18,
        ...(focused && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 1,
        })
      }}>
        <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
      </View>
    ),
    shop: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}15` : 'transparent',
        padding: 9,
        borderRadius: 18,
        ...(focused && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 1,
        })
      }}>
        <Search size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
      </View>
    ),
    orders: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}15` : 'transparent',
        padding: 9,
        borderRadius: 18,
        ...(focused && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 1,
        })
      }}>
        <ShoppingBag size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
      </View>
    ),
    cart: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}15` : 'transparent',
        padding: 9,
        borderRadius: 18,
        ...(focused && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 1,
        })
      }}>
        <ShoppingCart size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
      </View>
    ),
    wishlist: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}15` : 'transparent',
        padding: 9,
        borderRadius: 18,
        ...(focused && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 1,
        })
      }}>
        <Heart size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
      </View>
    ),
    profile: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}15` : 'transparent',
        padding: 9,
        borderRadius: 18,
        ...(focused && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 1,
        })
      }}>
        <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
      </View>
    ),
    bids: (color: string, focused: boolean) => (
      <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: focused ? `${color}15` : 'transparent',
        padding: 9,
        borderRadius: 18,
        ...(focused && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 1,
        })
      }}>
        <Gavel size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
      </View>
    )
  }), []);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors[colorScheme || 'light']?.background || '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          elevation: 0,
          shadowOpacity: 0,
          height: 62,
          paddingBottom: 8,
        },
        header: () => (
          <View style={[styles.header, { marginTop: insets.top }]}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerLogo}>Lot<Text style={styles.logoAccent}>waala</Text>
                <Text style={styles.headerDot}></Text>
                <Text style={styles.headerTrade}>B2B</Text>
              </Text>
            </View>
            {/* We can add action buttons here later if needed */}
          </View>
        ),
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 10,
          letterSpacing: 0.1,
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
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, focused }) => renderIcon.wishlist(color, focused),
        }}
      />
      <Tabs.Screen
        name="bids"
        options={{
          title: 'Bids',
          tabBarIcon: ({ color, focused }) => renderIcon.bids(color, focused),
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