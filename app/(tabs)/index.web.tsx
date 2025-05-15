import React, { useState } from 'react';
import { TextInput, Alert } from 'react-native';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import firebaseConfig from '@/firebaseConfig'; // Import your Firebase config

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Extend the Window interface to include recaptchaVerifier
declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
    }
}

export default function AuthScreens() {
    const [screen, setScreen] = useState<'login' | 'signup' | 'otp'>('login');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [verificationId, setVerificationId] = useState('');

    // Initialize Recaptcha
    const setupRecaptcha = () => {
        if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
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
            const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setVerificationId(confirmationResult.verificationId);
            setScreen('otp');
            Alert.alert('OTP Sent', 'Please check your phone for the OTP.');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error instanceof Error ? error.message : 'An unknown error occurred');
        }
    };

    const handleVerifyOtp = async () => {
        try {
            const credential = PhoneAuthProvider.credential(verificationId, otp);
            await signInWithCredential(auth, credential);
            Alert.alert('Success', 'OTP Verified!');
            setScreen('login');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Invalid OTP. Please try again.');
        }
    };

    return (
        <GluestackUIProvider>
            <Box className="flex-1 bg-white justify-center items-center px-4">
                {/* Recaptcha container */}
                {typeof window !== 'undefined' && <div id="recaptcha-container"></div>}

                {screen === 'login' && (
                    <VStack className="w-full max-w-[400px] p-6 bg-white rounded-lg shadow-md">
                        <Heading size="lg" className="mb-4 text-center">
                            Login
                        </Heading>
                        <TextInput
                            placeholder="Enter Phone Number"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
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
                        <Button className="mb-4" onPress={handleLogin}>
                            <ButtonText>Send OTP</ButtonText>
                        </Button>
                        <Text className="text-center text-typography-600">
                            Don't have an account?{' '}
                            <Text
                                className="text-primary-600 font-semibold"
                                onPress={() => setScreen('signup')}
                            >
                                Sign Up
                            </Text>
                        </Text>
                    </VStack>
                )}

                {screen === 'otp' && (
                    <VStack className="w-full max-w-[400px] p-6 bg-white rounded-lg shadow-md">
                        <Heading size="lg" className="mb-4 text-center">
                            Verify OTP
                        </Heading>
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
                        <Button className="mb-4" onPress={handleVerifyOtp}>
                            <ButtonText>Verify OTP</ButtonText>
                        </Button>
                        <Text className="text-center text-typography-600">
                            Didn't receive the OTP?{' '}
                            <Text className="text-primary-600 font-semibold" onPress={handleLogin}>
                                Resend
                            </Text>
                        </Text>
                    </VStack>
                )}
            </Box>
        </GluestackUIProvider>
    );
}