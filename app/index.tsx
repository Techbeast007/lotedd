import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        // Simulate async operation (e.g., AsyncStorage if on native)
        const user = await AsyncStorage.getItem('user'); // Replace with AsyncStorage.getItem('user') on native

        if (user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/role-selection');
        }
      } catch (error) {
        console.error("Redirect error:", error);
        router.replace('/role-selection');
      }
    };

    checkUserAndRedirect();
  }, []);

  return null;
}
