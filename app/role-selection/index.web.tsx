'use client';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useRouter } from "expo-router";
import React from 'react';
import { Image } from "react-native";

export default function RoleSelectionScreen() {
  const router = useRouter();

  const handleRoleSelection = (role: 'seller' | 'buyer') => {
    // Save the selected role in localStorage
    localStorage.setItem('currentRole', role);

    // Navigate to the next screen with the role as a parameter
    router.push({
      pathname: '/(auth)',
      params: { role }, // Pass the selected role as a parameter
    });
  };

  return (
    <GluestackUIProvider>
      <Center className="flex-1 bg-gray-50 px-4">
      {/* Background Curve */}
      {/* Background Curve - Top Right */}
      <Box
        style={{
          width: 800,
          height: 400,
          position: 'absolute',
          top: -190,
          right: -230,
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

      {/* Background Curve - Bottom Left */}
      <Box
        style={{
          width: 900,
          height: 500,
          position: 'absolute',
          top: -250,
          left: -300,
          backgroundColor: '#D9E4FF', // New color
          opacity: 0.7,
          transform: [{ rotate: '56deg' }],
          zIndex: 998,
          borderRadius: 500, // More rounded edges
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: 'https://via.placeholder.com/600x400/D9E4FF/000000?text=Our+Light+Blue+Image' }}
          alt="Background Curve"
          style={{
        width: '100%',
        height: '100%',
        borderRadius: 500, // Match the box's rounded edges
          }}
        />
      </Box>

      {/* Circular Div with Shadow and Icon */}
      <Center className="w-150 h-150 p-4 bg-white rounded-full shadow-lg mb-6">
        <Image
        source={ require('@/assets/images/important.png') }
        alt="Icon"
        style={{ width: 100, height: 100, borderRadius: 50 }}
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