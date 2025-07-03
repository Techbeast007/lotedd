import auth from '@react-native-firebase/auth';

// Export the auth instance for backward compatibility
export { auth };

// Check if user is authenticated
export const isAuthenticated = () => {
  return auth().currentUser !== null;
};

// Get current user
export const getCurrentUser = () => {
  return auth().currentUser;
};

// Sign in with email and password
export const signInWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Create user with email and password
export const createUserWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (displayName: string, photoURL?: string) => {
  try {
    const user = auth().currentUser;
    if (user) {
      await user.updateProfile({
        displayName,
        photoURL: photoURL || null,
      });
      return true;
    }
    return false;
  } catch (error) {
    throw error;
  }
};

// Sign out
export const signOut = async () => {
  try {
    await auth().signOut();
    return true;
  } catch (error) {
    throw error;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email: string) => {
  try {
    await auth().sendPasswordResetEmail(email);
    return true;
  } catch (error) {
    throw error;
  }
};

// Listen to auth state changes
export const onAuthStateChanged = (callback: (user: any) => void) => {
  return auth().onAuthStateChanged(callback);
};
