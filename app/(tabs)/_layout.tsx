import { Tabs } from 'expo-router';
import { Bell, Gavel, Home, Search, User } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 10,
          height: 70,
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
          borderTopWidth: 1,
          borderTopColor: 'rgba(0, 0, 0, 0.05)',
        },
        tabBarIconStyle: {
          marginTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 10,
        },
        tabBarItemStyle: {
          height: '100%',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
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
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
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
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: 'Updates',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: focused ? `${color}20` : 'transparent',
              padding: 10,
              borderRadius: 20,
            }}>
              <Bell size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profilesection"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: focused ? `${color}20` : 'transparent',
              padding: 10,
              borderRadius: 20,
            }}>
              <User size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bidsManage"
        options={{
          title: 'Bids',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: focused ? `${color}20` : 'transparent',
              padding: 10,
              borderRadius: 20,
            }}>
              <Gavel size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}