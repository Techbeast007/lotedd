import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
export default function IndexPage() {
  const router = useRouter();
  console.log('IndexPage initializing, checking auth status...');

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const user = await AsyncStorage.getItem('user'); // AsyncStorage on native
        const role = await AsyncStorage.getItem('currentRole'); // Get user role

        // Delay navigation to avoid "before mounting layout" error
        requestAnimationFrame(() => {
          if (user) {
            // Direct to the appropriate flow based on user role
            if (role === 'buyer') {
              console.log('User is buyer, navigating to /(buyer)/home');
              router.replace('/(buyer)/home');
            } else {
              console.log('User is seller, navigating to /(tabs)');
              router.replace('/(tabs)');
            }
          } else {
            console.log('No user, navigating to role selection');
            router.replace('/role-selection');
          }
        });
      } catch (error) {
        console.error("Redirect error:", error);
        requestAnimationFrame(() => {
          router.replace('/role-selection');
        });
      }
    };

    checkUserAndRedirect();
  }, [router]);

  return null;
}
