import { useChatContext } from '@/services/context/ChatContext';
import { Tabs, useRouter } from 'expo-router';
import { Bell, Gavel, Home, MessageCircle, Search, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { unreadCount } = useChatContext();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Update notification badge visibility based on unread count
    setHasUnreadMessages(unreadCount > 0);
  }, [unreadCount]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        header: ({ navigation, route, options }) => {
          return (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 16,
              paddingTop: 40,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#EEF2F6',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 5,
              elevation: 2,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 24,
                  fontWeight: '900',
                  color: '#3B82F6',
                  letterSpacing: 0.6,
                  fontStyle: 'italic',
                  textTransform: 'lowercase',
                }}>Lot<Text style={{
                  color: '#7C3AED',
                  fontWeight: '900',
                }}>waala</Text>
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={() => router.push('/messages')}
                style={{
                  padding: 8,
                  position: 'relative',
                }}
              >
                <MessageCircle size={22} color="#0F172A" />
                {hasUnreadMessages && (
                  <View style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    backgroundColor: '#EF4444',
                    borderRadius: 10,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 2,
                  }}>
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        },
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
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: focused ? `${color}20` : 'transparent',
              padding: 10,
              borderRadius: 20,
              position: 'relative'
            }}>
              <MessageCircle size={24} color={color} />
              {hasUnreadMessages && (
                <View style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  backgroundColor: '#EF4444',
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  borderWidth: 1,
                  borderColor: 'white',
                }} />
              )}
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