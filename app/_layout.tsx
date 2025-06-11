'use client';

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { CartProvider } from "@/services/context/CartContext";
import { getAuth, isFirebaseInitialized } from '@/services/firebaseService';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, AppStateStatus, Text, View } from 'react-native';

// Utility to track navigation state
const safeNavigation = {
  lastNavigatedPath: '',
  isNavigating: false,
  blockNavigationUntil: 0,
  setBlock: (durationMs = 2000) => {
    safeNavigation.blockNavigationUntil = Date.now() + durationMs;
  },
  canNavigate: () => {
    return Date.now() > safeNavigation.blockNavigationUntil && !safeNavigation.isNavigating;
  }
};

// Initialize auth outside of the component to avoid re-initialization
const auth = getAuth();

export default function RootLayout() {
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const hasNavigated = useRef(false);
  const isAuthenticated = useRef<boolean | null>(null);
  const currentSegmentRef = useRef<string[]>([]);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  
  const [authData, setAuthData] = useState<{
    user: string | null,
    role: string | null
  }>({
    user: null,
    role: null
  });
  
  // Load initial auth data only once
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        // Check Firebase initialization
        try {
          if (!isFirebaseInitialized()) {
            setFirebaseError('Firebase initialization failed');
            console.error('Firebase initialization failed');
            return;
          }
        } catch (error) {
          setFirebaseError(`Firebase error: ${error instanceof Error ? error.message : String(error)}`);
          console.error('Firebase error:', error);
          return;
        }
        
        const user = await AsyncStorage.getItem('user');
        const role = await AsyncStorage.getItem('currentRole');
        
        setAuthData({
          user,
          role
        });
      } catch (error) {
        console.error('Error loading auth data:', error);
      } finally {
        setIsReady(true);
      }
    };
    
    loadAuthData();
    
    // Monitor app state changes to prevent unwanted navigation when app comes from background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        // Don't reset the navigation flag when returning to foreground
        // hasNavigated.current = false;
      }
      
      appState.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isReady) return;
    
    const { user, role } = authData;
    const currentPath = pathname;
    
    // Don't navigate if we're already on the path we navigated to previously
    if (safeNavigation.lastNavigatedPath === currentPath) {
      console.log('Already on correct path:', currentPath);
      return;
    }
    
    // Determine current route category
    const isInAuthFlow = currentPath.includes('/role-selection') || currentPath.includes('/(auth)');
    const isInBuyerFlow = currentPath.includes('/(buyer)');
    const isInSellerFlow = currentPath.includes('/(tabs)');
    const isInSpecialRoutes = 
      currentPath.includes('/product/') || 
      currentPath.includes('/editProduct/') || 
      currentPath.includes('/productadd/');
    
    // If we're in a special route like product details, don't redirect
    if (isInSpecialRoutes) {
      console.log('In special route, not redirecting:', currentPath);
      return;
    }
    
    let shouldNavigate = false;
    let targetPath = '';
    
    // User is not authenticated and not in auth flow
    if (!user && !isInAuthFlow) {
      shouldNavigate = true;
      targetPath = '/role-selection';
      console.log('No authenticated user, redirecting to role selection');
    }
    // User is authenticated but in wrong flow
    else if (user) {
      if (role === 'buyer' && !isInBuyerFlow) {
        shouldNavigate = true;
        targetPath = '/(buyer)/home';
        console.log('User is buyer, redirecting to buyer home');
      } 
      else if (role === 'seller' && !isInSellerFlow) {
        shouldNavigate = true;
        targetPath = '/(tabs)';
        console.log('User is seller, redirecting to seller tabs');
      }
    }
    
    // Perform navigation if needed
    if (shouldNavigate && targetPath) {
      if (hasNavigated.current) {
        // If we've already navigated once in this session,
        // log it but don't navigate again to avoid loops
        console.log('Preventing multiple navigation redirects to:', targetPath);
        return;
      }
      
      console.log('Navigating to:', targetPath);
      hasNavigated.current = true;
      safeNavigation.lastNavigatedPath = targetPath;
      router.replace(targetPath);
    }
  }, [isReady, pathname, authData, router]);

  // Handle authentication state
  useEffect(() => {
    // Record current segments for later comparison
    currentSegmentRef.current = segments;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed. User:', user ? 'logged in' : 'logged out');
      
      const authenticated = !!user;
      isAuthenticated.current = authenticated;
      
      // Skip navigation if already on the correct route
      if (segments[0] === '(auth)' && !authenticated) {
        console.log('Already on auth route and not authenticated');
        return;
      }
      
      if (segments[0] === '(buyer)' && authenticated) {
        console.log('Already on buyer route and authenticated');
        return;
      }
      
      // Prevent additional navigations
      if (hasNavigated.current) {
        console.log('Navigation already performed, skipping');
        return;
      }
      
      // Block navigation if we're in a safety period
      if (!safeNavigation.canNavigate()) {
        console.log('Navigation blocked - in safety period');
        return;
      }
      
      // Special case: Don't redirect from product routes regardless of auth state
      const inProductRoute = segments.some(seg => 
        seg === 'product' || seg.startsWith('[id]') || seg === 'productadd'
      );
      
      if (inProductRoute) {
        console.log('In product route, skipping navigation redirect');
        return;
      }
      
      // Handle the actual navigation logic
      safeNavigation.isNavigating = true;
      hasNavigated.current = true;
      
      try {
        if (authenticated) {
          console.log('User authenticated, redirecting to buyer home');
          // Prevent navigation loops by checking current route
          if (segments[0] !== '(buyer)') {
            safeNavigation.lastNavigatedPath = '/(buyer)/home';
            router.replace('/(buyer)/home');
          }
        } else {
          console.log('User not authenticated, redirecting to auth');
          // Prevent navigation loops by checking current route
          if (segments[0] !== '(auth)') {
            safeNavigation.lastNavigatedPath = '/(auth)';
            router.replace('/(auth)');
          }
        }
      } catch (e) {
        console.error('Navigation error:', e);
      } finally {
        setTimeout(() => {
          safeNavigation.isNavigating = false;
        }, 100);
      }
    });

    // Clean up the auth listener
    return unsubscribe;
  }, [segments, router]);

  // Helper debug logging
  useEffect(() => {
    console.log('Current path:', pathname, 'hasNavigated:', hasNavigated.current);
  }, [pathname]);

  if (firebaseError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center', marginHorizontal: 20 }}>
          Firebase initialization error: {firebaseError}
        </Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 20, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <GluestackUIProvider mode="light">
      <CartProvider>
        <Slot />
      </CartProvider>
    </GluestackUIProvider>
  );
}
