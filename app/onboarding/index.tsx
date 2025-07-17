'use client';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity } from 'react-native';

export default function OnboardingScreen() {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Fetch the role and user data from AsyncStorage
    const fetchUserInfo = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('currentRole');
        setRole(storedRole);
        
        // Check if we have existing user data to pre-populate fields
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          
          if (userData.name) {
            setName(userData.name);
          }
          
          if (userData.email) {
            setEmail(userData.email);
          }
          
          if (userData.profilePicture) {
            setProfilePicture(userData.profilePicture);
          }
          
          if (storedRole === 'seller' && userData.gstNumber) {
            setGstNumber(userData.gstNumber);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserInfo();
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
      console.log('Save button pressed with values:', { name, email, role, gstNumber });
      
      if (!name || name.trim() === '') {
        console.log('Name validation failed:', { name });
        Alert.alert('Missing Information', 'Please enter your name to continue.');
        return;
      }
      
      if (role === 'seller' && (!gstNumber || gstNumber.trim() === '')) {
        console.log('GST validation failed:', { gstNumber });
        Alert.alert('Missing Information', 'Please enter your GST number to continue.');
        return;
      }

      const userJson = await AsyncStorage.getItem('user');
      if (!userJson) {
        Alert.alert('Error', 'User information not found. Please log in again.');
        router.push('/role-selection');
        return;
      }
      
      const user = JSON.parse(userJson);
      const uid = user.uid;

      // Base user data
      const userData: any = {
        name,
        email,
        onboardingCompleted: true,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      
      // Add profile picture if uploaded
      if (profilePicture) {
        userData.profilePicture = profilePicture;
      }

      // Add role-specific fields
      if (role === 'seller') {
        userData.gstNumber = gstNumber;
        userData.sellerOnboardingCompleted = true;
      } else if (role === 'buyer') {
        userData.buyerOnboardingCompleted = true;
      }

      console.log(`Saving ${role} onboarding data:`, userData);

      // Use set with merge option to update the user document
      await firestore().collection('users').doc(uid).set(userData, { merge: true });
      
      // Update local storage
      await AsyncStorage.setItem('user', JSON.stringify({ ...user, ...userData }));

      console.log('User data saved successfully:', userData);
      
      // Navigate to appropriate tab group based on user role
      if (role === 'buyer') {
        router.replace('/(buyer)/home');
      } else {
        router.replace('/(tabs)');
      }
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
          <InputField 
            placeholder="Enter your name" 
            value={name}
            onChangeText={setName}
          />
        </Input>

        {/* Email Input */}
        <Input className="mb-4">
          <InputField 
            placeholder="Enter your email" 
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
        </Input>

        {/* GST Number Input (Only for Sellers) */}
        {role === 'seller' && (
          <Input className="mb-4">
            <InputField 
              placeholder="Enter your GST number" 
              value={gstNumber}
              onChangeText={setGstNumber}
            />
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