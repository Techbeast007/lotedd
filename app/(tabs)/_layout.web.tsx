// (tabs)/_layout.tsx
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable } from 'react-native';
import ProfileDrawer from './profiletab';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          tabBarStyle: Platform.select({
            ios: { position: 'absolute' },
            default: {},
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <IconSymbol name="paperplane.fill" size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="empty" // This screen doesn't render anything, just placeholder
          options={{
            
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={() => {
                  setDrawerVisible(true);
                }}
                ref={undefined} // Explicitly set ref to undefined to avoid type conflict
              >
                <IconSymbol name="person.fill" size={28} color={props.accessibilityState?.selected ? Colors[colorScheme ?? 'light'].tint : 'gray'} />
              </Pressable>
            ),
          }}
        />
      </Tabs>

      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </>
  );
}
