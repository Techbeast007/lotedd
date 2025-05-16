'use client';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import firebaseConfig from '@/firebaseConfig'; // Import your Firebase config
import { useLocalSearchParams, useRouter } from 'expo-router';
import { initializeApp } from 'firebase/app';
import { getAuth, PhoneAuthProvider, RecaptchaVerifier, signInWithCredential, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { TextInput } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

// Extend the Window interface to include recaptchaVerifier
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore();

export default function AuthScreen() {
  const [screen, setScreen] = useState<'login' | 'otp'>('login');
  const [countryCode, setCountryCode] = useState('+91'); // Default country code
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const router = useRouter();
  const { role } = useLocalSearchParams(); // Get the role from the URL parameters

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ ...toast, visible: false }), 10000); // Hide toast after 10 seconds
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            console.log('Recaptcha verified');
          },
        }
     
      );
    }
  };

  const handleLogin = async () => {
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const fullPhoneNumber = `${countryCode}${phoneNumber}`; // Combine country code and phone number
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setVerificationId(confirmationResult.verificationId);
      setScreen('otp');
      showToast('OTP sent successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to send OTP. Please try again.', 'error');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const userCredential = await signInWithCredential(auth, credential);
  
      const user = userCredential.user; // Get the full user object
      const userExists = await checkIfUserExists(user.uid);
  
      if (userExists) {
        const { primaryRole, secondaryRole } = await handleExistingUserRoles(user.uid, role as string);
  
        // Save the full user object and roles in local storage
        const userData = {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          primaryRole,
          secondaryRole: secondaryRole || null,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('primaryRole', primaryRole);
        localStorage.setItem('secondaryRole', secondaryRole || '');
  
        showToast('Login successful!', 'success');
        router.push('/(tabs)');
      } else {
        await saveUserWithRole(user.uid, role as string, user.phoneNumber);
  
        // Save the full user object and primary role in local storage
        const userData = {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          primaryRole: role,
          secondaryRole: null,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('primaryRole', role as string);
        localStorage.setItem('secondaryRole', '');
  
        showToast('Welcome! Redirecting to onboarding.', 'success');
        router.push('/onboarding');
      }
    } catch (error) {
      console.error(error);
      showToast('Invalid OTP. Please try again.', 'error');
    }
  };
  
  const saveUserWithRole = async (uid: string, role: string, phoneNumber: string | null) => {
    try {
      await setDoc(doc(db, 'users', uid), {
        primaryRole: role,
        secondaryRole: null,
        phoneNumber: phoneNumber || null,
        createdAt: serverTimestamp(),
      });
      console.log(`User with UID: ${uid}, role: ${role}, and phone number: ${phoneNumber} saved successfully.`);
    } catch (error) {
      console.error('Error saving user with role:', error);
    }
  };

  const checkIfUserExists = async (uid: string): Promise<boolean> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      return userDoc.exists(); // Returns true if the user document exists
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false; // Default to user not existing in case of an error
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
        localStorage.setItem('primaryRole', primaryRole);
        localStorage.setItem('secondaryRole', secondaryRole || '');
      }
  
      return { primaryRole, secondaryRole };
    } catch (error) {
      console.error('Error handling existing user roles:', error);
      return { primaryRole: 'unknown', secondaryRole: null }; // Fallback in case of an error
    }
  };
  
  const getUserRolesFromDatabase = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
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
      await updateDoc(doc(db, 'users', uid), {
        primaryRole,
        secondaryRole,
        updatedAt: serverTimestamp(),
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

        {/* Recaptcha container */}
        <div id="recaptcha-container"></div>

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
                  width: 60,
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