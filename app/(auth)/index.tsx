'use client';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { TextInput } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function AuthScreen() {
  const [screen, setScreen] = useState<'login' | 'otp'>('login');
  const [countryCode, setCountryCode] = useState('+91'); // Default country code
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const router = useRouter();
  const { role } = useLocalSearchParams(); // Get the role from the URL parameters

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ ...toast, visible: false }), 10000); // Hide toast after 10 seconds
  };

  const handleLogin = async () => {
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`; // Combine country code and phone number
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirmation(confirmationResult);
      setScreen('otp');
      showToast('OTP sent successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to send OTP. Please try again.', 'error');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      if (!confirmation) throw new Error('No confirmation available');
      const userCredential = await confirmation.confirm(otp);

      if (!userCredential) {
        throw new Error('User credential is null');
      }
      const user = userCredential.user; // Get the full user object
      const userExists = await checkIfUserExists(user.uid);

      if (userExists) {
        const { primaryRole, secondaryRole } = await handleExistingUserRoles(user.uid, role as string);

        // Save the full user object and roles in AsyncStorage
        const userData = {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          primaryRole,
          secondaryRole: secondaryRole || null,
        };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('primaryRole', primaryRole);
        await AsyncStorage.setItem('secondaryRole', secondaryRole || '');

        showToast('Login successful!', 'success');
        router.push('/(tabs)');
      } else {
        await saveUserWithRole(user.uid, role as string, user.phoneNumber);

        // Save the full user object and primary role in AsyncStorage
        const userData = {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          primaryRole: role,
          secondaryRole: null,
        };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('primaryRole', role as string);
        await AsyncStorage.setItem('secondaryRole', '');

        showToast('Welcome! Redirecting to onboarding.', 'success');
        router.push('/onboarding');
      }
    } catch (error) {
      console.error(error);
      showToast('Invalid OTP. Please try again.', 'error');
    }
  };

  const checkIfUserExists = async (uid: string): Promise<boolean> => {
    try {
      const userDoc = await firestore().collection('users').doc(uid).get();
      return userDoc.exists(); // Returns true if the user document exists
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false; // Default to user not existing in case of an error
    }
  };

  const saveUserWithRole = async (uid: string, role: string, phoneNumber: string | null) => {
    try {
      await firestore().collection('users').doc(uid).set({
        primaryRole: role,
        secondaryRole: null,
        phoneNumber: phoneNumber || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      console.log(`User with UID: ${uid}, role: ${role}, and phone number: ${phoneNumber} saved successfully.`);
    } catch (error) {
      console.error('Error saving user with role:', error);
    }
  };

  const handleExistingUserRoles = async (uid: string, newRole: string) => {
    try {
      const userRoles = await getUserRolesFromDatabase(uid);

      let primaryRole = userRoles.primaryRole;
      let secondaryRole = userRoles.secondaryRole;

      if (primaryRole !== newRole) {
        secondaryRole = newRole;
        await updateUserRolesInDatabase(uid, primaryRole, secondaryRole);
        await AsyncStorage.setItem('primaryRole', primaryRole);
        await AsyncStorage.setItem('secondaryRole', secondaryRole || '');
      }

      return { primaryRole, secondaryRole };
    } catch (error) {
      console.error('Error handling existing user roles:', error);
      return { primaryRole: 'unknown', secondaryRole: null }; // Fallback in case of an error
    }
  };

  const getUserRolesFromDatabase = async (uid: string) => {
    try {
      const userDoc = await firestore().collection('users').doc(uid).get();
      if (userDoc.exists()) {
        const data = userDoc.data();
        return { primaryRole: data?.primaryRole, secondaryRole: data?.secondaryRole };
      } else {
        throw new Error('User document does not exist');
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return { primaryRole: 'unknown', secondaryRole: null }; // Fallback in case of an error
    }
  };

  const updateUserRolesInDatabase = async (uid: string, primaryRole: string, secondaryRole: string | null) => {
    try {
      await firestore().collection('users').doc(uid).update({
        primaryRole,
        secondaryRole,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Roles updated for UID: ${uid}, Primary Role: ${primaryRole}, Secondary Role: ${secondaryRole}`);
    } catch (error) {
      console.error('Error updating user roles:', error);
    }
  };

  return (
    <GluestackUIProvider>
      <Box className="flex-1 bg-gray-50 justify-center items-center px-4">
        {/* Toast Notification */}
        {toast.visible && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            className={`absolute top-10 w-[90%] max-w-[400px] p-4 rounded-lg ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            <Text className="text-white text-center">{toast.message}</Text>
          </Animated.View>
        )}

        {screen === 'login' && (
          <VStack className="w-full max-w-[400px] p-6 bg-white rounded-lg shadow-md">
            <Heading size="lg" className="mb-2 text-left font-bold">
              Log in
            </Heading>
            <Text className="mb-6 text-left text-gray-500">
              Enter your phone number to continue.
            </Text>
            <VStack className="flex-row items-center mb-4">
              <TextInput
                placeholder="+91"
                value={countryCode}
                onChangeText={setCountryCode}
                style={{
                  width: 70,
                  height: 50,
                  borderColor: '#ddd',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  marginRight: 10,
                  fontSize: 16,
                  backgroundColor: '#f9f9f9',
                }}
              />
              <TextInput
                placeholder="Enter Phone Number"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                style={{
                  flex: 1,
                  height: 50,
                  borderColor: '#ddd',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  fontSize: 16,
                  backgroundColor: '#f9f9f9',
                }}
              />
            </VStack>
            <Button className="mb-4 bg-blue-500" onPress={handleLogin}>
              <ButtonText className="text-white">Send OTP</ButtonText>
            </Button>
          </VStack>
        )}

        {screen === 'otp' && (
          <VStack className="w-full max-w-[400px] p-6 bg-white rounded-lg shadow-md">
            <Heading size="lg" className="mb-2 text-left font-bold">
              Verify OTP
            </Heading>
            <Text className="mb-6 text-left text-gray-500">
              Enter the OTP sent to your phone.
            </Text>
            <TextInput
              placeholder="Enter OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              style={{
                height: 50,
                borderColor: '#ddd',
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 10,
                marginBottom: 20,
                fontSize: 16,
                backgroundColor: '#f9f9f9',
              }}
            />
            <Button className="mb-4 bg-green-500" onPress={handleVerifyOtp}>
              <ButtonText className="text-white">Verify OTP</ButtonText>
            </Button>
          </VStack>
        )}
      </Box>
    </GluestackUIProvider>
  );
}