'use client';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import React from 'react';
import { Image } from "react-native";

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
      <Center className="flex-1 bg-gray-50 px-4">
      {/* Background Curve on Right */}
      <Box
        style={{
          width: 500,
          height: 300,
          position: 'absolute',
          top: -90,
          right: -150,
          backgroundColor: '#004CFF', // Use button color
          opacity: 0.8,
          transform: [{ rotate: '60deg' }],
          zIndex: 999,
          borderRadius: '50%', // Make it circular
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: 'https://via.placeholder.com/500x300/004CFF/FFFFFF?text=Our+Blue+Image' }}
          alt="Background Curve"
          style={{
        width: '100%',
        height: '100%',
          }}
        />
      </Box>

      {/* Background Curve on Left */}
      <Box
        style={{
          width: 500,
          height: 300,
          position: 'absolute',
          top: -90,
          left: -190,
          backgroundColor: '#D9E4FF', // New color
          opacity: 0.8,
          transform: [{ rotate: '-60deg' }],
          
          borderRadius: '50%', // Make it circular
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: 'https://via.placeholder.com/500x300/D9E4FF/FFFFFF?text=Our+Light+Blue+Image' }}
          alt="Background Curve"
          style={{
        width: '100%',
        height: '100%',
          }}
        />
      </Box>

      {/* Circular Div with Shadow and Icon */}
      <Center className="w-150 h-150 bg-white rounded-full shadow-lg mb-6">
        <Image
        source={{ uri: 'https://t4.ftcdn.net/jpg/03/32/31/65/360_F_332316530_ofa4oQA3ZGWxd4tRLDqKuADfy2hnpWuU.jpg' }}
        alt="Icon"
        style={{ width: 140, height: 140, borderRadius: 50 }}
        />
      </Center>

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
        className="w-full gap-2 bg-[#004CFF]"
        variant="solid"
        action="secondary"
        onPress={() => handleRoleSelection('seller')}
        size="xl"
        >
        <ButtonText className="text-white" size="xl">
          Seller
        </ButtonText>
        </Button>

        <Button
        className="w-full gap-2 bg-[#004CFF] mt-5"
        variant="solid"
        action="secondary"
        onPress={() => handleRoleSelection('buyer')}
        size="xl"
        >
        <ButtonText className="text-white" size="xl">
          Buyer
        </ButtonText>
        </Button>
      </VStack>

      {/* Footer Text */}
      <Text className="text-gray-600 text-sm mt-10">
        Select your role to get started!
      </Text>
      </Center>
    </GluestackUIProvider>
  
  );
}