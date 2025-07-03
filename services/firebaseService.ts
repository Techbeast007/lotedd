import { getApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import app from './firebaseInitialize';

// Export Firebase service instances directly
export { auth, firestore, storage };

// Check if Firebase is initialized
export const isFirebaseInitialized = () => {
  try {
    return !!getApp();
  } catch (error) {
    return false;
  }
};

// Export the app instance for direct use if needed
export { app };
