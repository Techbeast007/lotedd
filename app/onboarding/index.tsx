'use client';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity } from 'react-native';

export default function OnboardingScreen() {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the role from AsyncStorage
    const fetchRole = async () => {
      const storedRole = await AsyncStorage.getItem('primaryRole');
      setRole(storedRole);
    };
    fetchRole();
  }, []);

  const handleProfilePictureUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'You need to allow access to your media library to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      const user = JSON.parse(await AsyncStorage.getItem('user') || '{}');
      const uid = user.uid;

      const userData: any = {
        name,
        email,
        profilePicture,
      };

      if (role === 'seller') {
        userData.gstNumber = gstNumber;
      }

      await firestore().collection('users').doc(uid).update(userData);

      console.log('User data saved successfully:', userData);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving user data:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  return (
    <Box className="flex-1 bg-gray-50 justify-center items-center px-4 py-6">
      <VStack className="w-full max-w-[400px] p-6 bg-white rounded-lg shadow-md">
        <Heading size="lg" className="mb-4 text-left font-bold">
          Complete Your Profile
        </Heading>

        {/* Profile Picture Upload */}
        <TouchableOpacity
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: '#ddd',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'flex-start',
            marginBottom: 20,
          }}
          onPress={handleProfilePictureUpload}
        >
          {profilePicture ? (
            <Image
              source={{ uri: profilePicture }}
              style={{ width: 100, height: 100, borderRadius: 50 }}
            />
          ) : (
            <Text style={{ color: '#555' }}>Upload</Text>
          )}
        </TouchableOpacity>

        {/* Name Input */}
        <Input className="mb-4">
          <InputField placeholder="Enter your name" />
          <InputSlot>
            <InputField
              value={name}
              onChangeText={setName}
              style={{ display: 'none' }} // Hide the native input if needed
            />
          </InputSlot>
        </Input>

        {/* Email Input */}
        <Input className="mb-4">
          <InputField placeholder="Enter your email" type="text" />
          <InputSlot>
            <InputField
              value={email}
              onChangeText={setEmail}
              style={{ display: 'none' }} // Hide the native input if needed
            />
          </InputSlot>
        </Input>

        {/* GST Number Input (Only for Sellers) */}
        {role === 'seller' && (
          <Input className="mb-4">
            <InputField placeholder="Enter your GST number" />
            <InputSlot>
              <InputField
                value={gstNumber}
                onChangeText={setGstNumber}
                style={{ display: 'none' }} // Hide the native input if needed
              />
            </InputSlot>
          </Input>
        )}

        {/* Save Button */}
        <Button className="bg-blue-500" onPress={handleSave}>
          <ButtonText className="text-white">Save</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}