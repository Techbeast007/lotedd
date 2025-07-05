import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { auth } from './authService';

// Get user profile by ID
export const getUserProfileById = async (userId: string) => {
  try {
    // First, check if the user is available in Firestore users collection
    const userDoc = await firestore().collection('users').doc(userId).get();
    
    if (userDoc.exists()) {
      // Return the user data from Firestore
      return {
        id: userDoc.id,
        ...userDoc.data(),
      };
    }
    
    // If not found in Firestore, check if it's the current authenticated user
    const currentUser = auth().currentUser;
    if (currentUser && currentUser.uid === userId) {
      // Return basic auth user data
      return {
        id: currentUser.uid,
        name: currentUser.displayName || '',
        email: currentUser.email || '',
        avatar: currentUser.photoURL || '',
        type: 'unknown', // Since we don't have this info from auth
      };
    }
    
    // Return null if user not found
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Cache for user profiles to avoid excessive Firestore reads
const userProfileCache = new Map();

// Get user profile with caching
export const getUserProfileWithCache = async (userId: string) => {
  // Return from cache if available
  if (userProfileCache.has(userId)) {
    return userProfileCache.get(userId);
  }
  
  // Fetch from Firebase
  const profile = await getUserProfileById(userId);
  
  // Store in cache if found
  if (profile) {
    userProfileCache.set(userId, profile);
  }
  
  return profile;
};

// Clear cache for a specific user or all users
export const clearUserProfileCache = (userId?: string) => {
  if (userId) {
    userProfileCache.delete(userId);
  } else {
    userProfileCache.clear();
  }
};

// Get current authenticated user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    // Check from Auth
    const currentUser = auth().currentUser;
    if (currentUser) return currentUser.uid;
    
    // If not in Auth, check AsyncStorage
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.uid || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

// Get the other participant in a conversation (not the current user)
export const getOtherParticipant = async (participants: {id: string; name: string; type: string; avatar?: string}[]) => {
  if (!participants || participants.length === 0) {
    return null;
  }
  
  try {
    // Get current user ID
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return participants[0]; // If we can't determine current user, return first participant
    
    // Find the participant that is NOT the current user
    const otherParticipant = participants.find(p => p.id !== currentUserId);
    
    // If found, return that participant, otherwise return the first one
    return otherParticipant || participants[0];
  } catch (error) {
    console.error('Error finding other participant:', error);
    // Fallback to first participant
    return participants[0];
  }
};
