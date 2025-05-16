'use client';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';

export default function RoleSelectionScreen() {
  const router = useRouter();

  const handleRoleSelection = (role: 'seller' | 'buyer') => {
    // Save the selected role in localStorage
    const saveRoleToStorage = async (role: 'seller' | 'buyer') => {
      try {
      await AsyncStorage.setItem('currentRole', role);
      } catch (error) {
      console.error('Failed to save the role to storage:', error);
      }
    };

    saveRoleToStorage(role);

    // Navigate to the next screen with the role as a parameter
    router.push({
      pathname: '/(auth)',
      params: { role }, // Pass the selected role as a parameter
    });
  };

  return (
    <GluestackUIProvider>
      <Box className="flex-1 bg-gray-50 justify-center items-center px-4">
        {/* LOTWALLA Title */}
        <Text
          className="text-5xl font-bold text-gray-800 border-4 border-gray-800 px-6 py-2 rounded-lg mb-10"
          style={{ letterSpacing: 2 }}
        >
          LOTWALLA
        </Text>

        {/* Buttons for Role Selection */}
        <VStack className="w-full max-w-[300px] space-y-4">
          <Button
            className="bg-blue-500 border-2 border-blue-500 rounded-lg"
            onPress={() => handleRoleSelection('seller')}
          >
            <ButtonText className="text-white text-lg">I am a Seller</ButtonText>
          </Button>
          <Button
            className="bg-green-500 border-2 border-green-500 rounded-lg"
            onPress={() => handleRoleSelection('buyer')}
          >
            <ButtonText className="text-white text-lg">I am a Buyer</ButtonText>
          </Button>
        </VStack>
      </Box>
    </GluestackUIProvider>
  );
}