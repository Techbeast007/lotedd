'use client';

import CountryCodeSelector from '@/components/CountryCodeSelector';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Text as RNText, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

// Custom loading spinner component
const LoadingSpinner = () => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);
  
  return (
    <Animated.View 
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: 'white',
        borderTopColor: 'transparent',
        marginRight: 8,
        transform: [
          {
            rotate: spinAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg']
            })
          }
        ]
      }}
    />
  );
};

// Simple animation for toast
interface FadeInViewProps {
  style?: any;
  children: React.ReactNode;
}

const FadeInView = (props: FadeInViewProps) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    return () => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };
  }, [opacity]);

  return (
    <Animated.View style={{ ...props.style, opacity }}>
      {props.children}
    </Animated.View>
  );
};

// Simple animation for screen transitions
interface SlideInViewProps {
  style?: any;
  children: React.ReactNode;
}

const SlideInView = (props: SlideInViewProps) => {
  const translateX = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  return (
    <Animated.View style={{ ...props.style, transform: [{ translateX }] }}>
      {props.children}
    </Animated.View>
  );
};

export default function AuthScreen() {
  const [screen, setScreen] = useState('login');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);
  const router = useRouter();
  const { role } = useLocalSearchParams();
  
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuthState = async () => {
      try {
        const user = auth().currentUser;
        const savedUser = await AsyncStorage.getItem('user');
        
        if (user && savedUser) {
          const userData = JSON.parse(savedUser);
          const currentRole = await AsyncStorage.getItem('currentRole');
          
          // Redirect to the appropriate screen based on role
          if (currentRole === 'buyer') {
            router.replace('/(buyer)/home');
          } else {
            router.replace('/(tabs)');
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      }
    };
    
    checkAuthState();
  }, [router]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ ...toast, visible: false }), 5000);
  };

  const validatePhoneNumber = () => {
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    
    if (!phoneDigits || phoneDigits.length < 10) {
      setPhoneError('Please enter a valid phone number');
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const handleLogin = async () => {
    if (!validatePhoneNumber()) return;
    
    setIsLoading(true);
    try {
      const formattedNumber = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
      const fullPhoneNumber = `${countryCode}${formattedNumber}`;
      console.log('Attempting to sign in with:', fullPhoneNumber);
      
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirmation(confirmationResult);
      setScreen('otp');
      showToast('OTP sent successfully!', 'success');
      
      setCountdown(30);
      setResendDisabled(true);
      
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 500);      } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Failed to send OTP';
      
      if (errorMessage.includes('quota')) {
        showToast('Too many attempts. Please try again later.', 'error');
      } else if (errorMessage.includes('format')) {
        showToast('Invalid phone number format. Please check and try again.', 'error');
      } else {
        showToast('Failed to send OTP. Please check your phone number and try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      showToast('Please enter a valid 6-digit OTP', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      if (!confirmation) {
        throw new Error('No confirmation available');
      }
      
      console.log('Verifying OTP:', otpValue);
      const userCredential = await confirmation.confirm(otpValue);

      if (!userCredential) {
        throw new Error('User credential is null');
      }
      
      const user = userCredential.user;
      console.log('User authenticated:', user.uid);
      
      const userExists = await checkIfUserExists(user.uid);
      console.log('User exists in database:', userExists);

      if (userExists) {
        // Get existing user roles
        const { primaryRole, secondaryRole } = await handleExistingUserRoles(user.uid, role as string);
        
        // Check if user is trying to use a role they haven't used before
        const isNewRoleForUser = primaryRole !== role && secondaryRole !== role;
        
        // Save the full user object and roles in AsyncStorage
        const userData = {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          primaryRole,
          secondaryRole: isNewRoleForUser && !secondaryRole ? role : secondaryRole,
          currentRole: role, // The role the user is currently using
        };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('primaryRole', primaryRole);
        await AsyncStorage.setItem('secondaryRole', isNewRoleForUser && !secondaryRole ? role : (secondaryRole || ''));
        await AsyncStorage.setItem('currentRole', role as string);

        // Check if this user has onboarded for this role already
        const hasOnboarded = await checkIfUserHasOnboardedForRole(user.uid, role as string);
        
        if (isNewRoleForUser && !hasOnboarded) {
          // If user is using a new role and hasn't completed onboarding for it
          showToast('Please complete your profile for this role', 'success');
          
          // If this is a secondary role, update it in the database
          if (!secondaryRole) {
            await updateUserRolesInDatabase(user.uid, primaryRole, role as string);
          }
          
          router.push('/onboarding');
        } else {
          // User has used this role before
          showToast('Login successful!', 'success');
          
          // Redirect based on the current role the user has selected
          if (role === 'buyer') {
            // Navigate to the buyer home screen
            router.replace('/(buyer)/home');
          } else {
            router.replace('/(tabs)');
          }
        }
      } else {
        // New user - set their selected role as primary role
        await saveUserWithRole(user.uid, role as string, user.phoneNumber);

        // Save the full user object and primary role in AsyncStorage
        const userData = {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          primaryRole: role,
          secondaryRole: null,
          currentRole: role, // For new users, current role is the same as primary role
        };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('primaryRole', role as string);
        await AsyncStorage.setItem('secondaryRole', '');
        await AsyncStorage.setItem('currentRole', role as string);

        showToast('Welcome! Redirecting to onboarding.', 'success');
        router.push('/onboarding');
      }      } catch (error: any) {
      console.error('OTP verification error:', error);
      const errorMessage = error.message || 'Invalid OTP';
      
      if (errorMessage.includes('invalid-verification-code')) {
        showToast('Invalid verification code. Please try again.', 'error');
      } else if (errorMessage.includes('expired')) {
        showToast('OTP has expired. Please request a new one.', 'error');
      } else {
        showToast('Invalid OTP. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendDisabled) return;
    
    setIsLoading(true);
    try {
      const formattedNumber = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
      const fullPhoneNumber = `${countryCode}${formattedNumber}`;
      console.log('Resending OTP to:', fullPhoneNumber);
      
      const confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirmation(confirmationResult);
      
      // Reset OTP fields
      setOtp(['', '', '', '', '', '']);
      
      // Reset countdown for resend
      setCountdown(30);
      setResendDisabled(true);
      
      showToast('OTP resent successfully!', 'success');
      
      // Focus the first OTP input
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }      } catch (error: any) {
      console.error('Resend OTP error:', error);
      const errorMessage = error.message || 'Failed to resend OTP';
      
      if (errorMessage.includes('quota')) {
        showToast('Too many attempts. Please try again later.', 'error');
      } else {
        showToast('Failed to resend OTP. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfUserExists = async (uid: string): Promise<boolean> => {
    try {
      console.log('Checking if user exists:', uid);
      
      // Check if user document exists in Firestore
      const userDoc = await firestore().collection('users').doc(uid).get();
      const data = userDoc.data();
      
      // If the document has data, the user exists
      if (data) {
        console.log('User exists in Firestore with data');
        return true;
      }
      
      console.log('User does not exist in Firestore or has no data');
      return false;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false; // Default to user not existing in case of an error
    }
  };

  const saveUserWithRole = async (uid: string, role: string, phoneNumber: string | null) => {
    try {
      console.log('Saving new user with role:', role);
      await firestore().collection('users').doc(uid).set({
        primaryRole: role,
        secondaryRole: null,
        phoneNumber: phoneNumber || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      console.log(`User with UID: ${uid}, role: ${role}, and phone number: ${phoneNumber} saved successfully.`);
    } catch (error) {
      console.error('Error saving user with role:', error);
      throw error; // Re-throw to handle in the calling function
    }
  };

  const checkIfUserHasOnboardedForRole = async (uid: string, role: string): Promise<boolean> => {
    try {
      console.log('Checking if user has onboarded for role:', role);
      
      // Get user document
      const userDocRef = firestore().collection('users').doc(uid);
      const userDoc = await userDocRef.get();
      
      // Get user data
      const userData = userDoc.data();
      
      // If document doesn't exist or has no data, create a basic one to avoid future errors
      if (!userData) {
        console.log('User document does not exist or is empty, creating a basic entry');
        try {
          // Create a minimal user document to avoid future errors
          await userDocRef.set({
            primaryRole: role,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        } catch (createError) {
          console.error('Error creating user document:', createError);
        }
        return false;
      }
      
      // Check role-specific onboarding flags
      if (role === 'buyer') {
        // Check the specific buyer onboarding flag or fall back to check if they have basic fields
        return userData.buyerOnboardingCompleted === true || 
               (!!userData.name && (userData.onboardingCompleted === true || 
                                   userData.primaryRole === 'buyer'));
      }
      
      if (role === 'seller') {
        // Check the specific seller onboarding flag or fall back to check if they have seller-specific fields
        return userData.sellerOnboardingCompleted === true || 
               (!!userData.name && !!userData.gstNumber);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if user has onboarded:', error);
      return false;
    }
  };

  const handleExistingUserRoles = async (uid: string, newRole: string) => {
    try {
      console.log('Handling existing user roles for:', uid);
      let userRoles;
      
      try {
        // Try to get user roles, but handle the case where document doesn't exist
        userRoles = await getUserRolesFromDatabase(uid);
      } catch (error) {
        // If there's an error (like document not existing), create a basic user entry
        console.log('Error getting user roles, creating default entry:', error);
        await saveUserWithRole(uid, newRole, null);
        return { primaryRole: newRole, secondaryRole: null, currentRole: newRole };
      }

      let primaryRole = userRoles.primaryRole;
      let secondaryRole = userRoles.secondaryRole;
      let currentRole = newRole; // The role the user selected during login

      console.log('User roles from DB:', { primaryRole, secondaryRole });
      console.log('New selected role:', newRole);

      // If this is the first time user is selecting a second role
      if (primaryRole !== newRole && !secondaryRole) {
        secondaryRole = newRole;
        await updateUserRolesInDatabase(uid, primaryRole, secondaryRole);
        console.log('Updated user with new secondary role:', secondaryRole);
      }
      // If user already has a secondary role but is switching to a new third role
      else if (primaryRole !== newRole && secondaryRole !== newRole) {
        // In this case, we're just using the new role as current but not saving it
        console.log(`User attempting to use a third role (${newRole}). Using it temporarily.`);
      }

      // Save role preferences
      await AsyncStorage.setItem('primaryRole', primaryRole);
      await AsyncStorage.setItem('secondaryRole', secondaryRole || '');
      await AsyncStorage.setItem('currentRole', currentRole);

      return { primaryRole, secondaryRole, currentRole };
    } catch (error) {
      console.error('Error handling existing user roles:', error);
      // Set current role as the requested role if there's an error
      return { primaryRole: newRole, secondaryRole: null, currentRole: newRole }; 
    }
  };

  const getUserRolesFromDatabase = async (uid: string) => {
    try {
      console.log('Getting user roles from database for:', uid);
      const userDoc = await firestore().collection('users').doc(uid).get();
      const data = userDoc.data();
      
      if (data) {
        console.log('User data retrieved:', data);
        return { 
          primaryRole: data.primaryRole || 'unknown', 
          secondaryRole: data.secondaryRole || null 
        };
      } else {
        console.log('User document does not exist');
        throw new Error('User document does not exist');
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return { primaryRole: 'unknown', secondaryRole: null }; 
    }
  };

  const updateUserRolesInDatabase = async (uid: string, primaryRole: string, secondaryRole: string | null) => {
    try {
      console.log('Updating user roles in database:', { uid, primaryRole, secondaryRole });
      
      // First check if the user document exists to avoid "not found" errors
      const userDoc = await firestore().collection('users').doc(uid).get();
      const data = userDoc.data();
      
      if (!data) {
        // Document doesn't exist, create it with set instead of update
        console.log('User document does not exist, creating it...');
        await firestore().collection('users').doc(uid).set({
          primaryRole,
          secondaryRole,
          updatedAt: firestore.FieldValue.serverTimestamp(),
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Document exists, update it
        await firestore().collection('users').doc(uid).update({
          primaryRole,
          secondaryRole,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
      
      console.log(`Roles updated for UID: ${uid}, Primary Role: ${primaryRole}, Secondary Role: ${secondaryRole}`);
    } catch (error) {
      console.error('Error updating user roles:', error);
      throw error; // Re-throw to handle in the calling function
    }
  };

  return (
    <View style={styles.container}>
      {/* Toast Notification */}
      {toast.visible && (
        <FadeInView
          style={[
            styles.toastContainer,
            { backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444' }
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} color="white" />
            ) : (
              <AlertCircle size={20} color="white" />
            )}
            <RNText style={styles.toastText}>{toast.message}</RNText>
          </View>
        </FadeInView>
      )}

      {screen === 'login' && (
        <View style={styles.formContainer}>
          <View style={styles.form}>
            <RNText style={styles.heading}>Log in or Sign up</RNText>
            <RNText style={styles.subtitle}>
              Enter your phone number to continue to {role === 'seller' ? 'Seller' : 'Buyer'} account
            </RNText>
            
            <RNText style={styles.inputLabel}>Phone Number</RNText>
            <View style={styles.phoneInputContainer}>
              <CountryCodeSelector
                value={countryCode}
                onChange={setCountryCode}
                style={styles.countryCodeInput}
              />
              <TextInput
                placeholder="Enter Phone Number"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (phoneError) setPhoneError('');
                }}
                style={styles.phoneInput}
                maxLength={10}
              />
            </View>
            
            {phoneError ? (
              <RNText style={styles.errorText}>{phoneError}</RNText>
            ) : null}
            
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!phoneNumber || isLoading) ? styles.disabledButton : {}
              ]}
              onPress={handleLogin}
              disabled={!phoneNumber || isLoading}
            >
              {isLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <LoadingSpinner />
                  <RNText style={styles.buttonText}>Sending...</RNText>
                </View>
              ) : (
                <RNText style={styles.buttonText}>Continue</RNText>
              )}
            </TouchableOpacity>
            
            <RNText style={styles.termsText}>
              By continuing you agree to our Terms and Privacy Policy
            </RNText>
          </View>
        </View>
      )}

      {screen === 'otp' && (
        <SlideInView style={styles.formContainer}>
          <View style={styles.form}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setScreen('login')}
            >
              <ArrowLeft size={22} color="#333" />
            </TouchableOpacity>
            
            <RNText style={styles.heading}>Verification Code</RNText>
            
            <RNText style={styles.subtitle}>
              Enter the 6-digit code sent to {countryCode} {phoneNumber}
            </RNText>
            
            <View style={styles.otpContainer}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) {
                      inputRefs.current[index] = ref;
                    }
                  }}
                  style={styles.otpInput}
                  value={otp[index]}
                  onChangeText={(text) => handleOtpChange(text.replace(/[^0-9]/g, ''), index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                />
              ))}
            </View>
            
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (otp.join('').length !== 6 || isLoading) ? styles.disabledButton : {}
              ]}
              onPress={handleVerifyOtp}
              disabled={otp.join('').length !== 6 || isLoading}
            >
              {isLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <LoadingSpinner />
                  <RNText style={styles.buttonText}>Verifying...</RNText>
                </View>
              ) : (
                <RNText style={styles.buttonText}>Verify and Continue</RNText>
              )}
            </TouchableOpacity>
            
            <View style={styles.resendContainer}>
              <RNText style={styles.resendText}>Didn&apos;t receive the code? </RNText>
              {countdown > 0 ? (
                <RNText style={styles.countdownText}>Resend in {countdown}s</RNText>
              ) : (
                <TouchableOpacity 
                  onPress={handleResendOtp} 
                  disabled={resendDisabled || isLoading}
                >
                  <RNText style={[
                    styles.resendActionText,
                    (resendDisabled || isLoading) ? styles.disabledText : {}
                  ]}>
                    Resend
                  </RNText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SlideInView>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');
const OTP_INPUT_SIZE = Math.min((width - 96) / 6, 50);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    width: '90%',
    maxWidth: 400,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  countryCodeInput: {
    width: 100,
    height: 52,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    borderColor: '#d1d5db',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#f9fafb',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#93c5fd',
    opacity: 0.8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
  },
  otpInput: {
    width: OTP_INPUT_SIZE,
    height: OTP_INPUT_SIZE,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    color: '#1F2937',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    color: '#6B7280',
    fontSize: 14,
  },
  resendActionText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  countdownText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledText: {
    opacity: 0.5,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    zIndex: 1000,
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});