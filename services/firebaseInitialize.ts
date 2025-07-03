import { getApp, getApps, initializeApp } from '@react-native-firebase/app';
import firebaseConfig from '../firebaseConfig.js';

// Initialize Firebase if it hasn't been initialized yet
const initializeFirebase = () => {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  } else {
    return getApp();
  }
};

// Initialize Firebase on import
const app = initializeFirebase();

export default app;
