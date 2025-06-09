import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';

// Get the Firebase app instance - it initializes automatically
// but we're using getApp() as recommended in the deprecation warning
const app = getApp();

// Export Firebase service instances - using the recommended modular approach
export { getAuth, getFirestore, getStorage };

// Check if Firebase is initialized using the modular API
export const isFirebaseInitialized = () => {
  try {
    return !!getApp();
  } catch (error) {
    return false;
  }
};

// Export the app instance for direct use if needed
export { app };
