'use client';

import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CreditCard,
  Heart,
  HelpCircle, LogOut,
  MapPin,
  Settings,
  ShoppingBag,
  User
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    profilePicture: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const user = await AsyncStorage.getItem('user');
      
      if (user) {
        const parsedUser = JSON.parse(user);
        const userDoc = await firestore().collection('users').doc(parsedUser.uid).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          setUserData({
            name: userData?.name || 'User',
            email: userData?.email || '',
            phoneNumber: parsedUser.phoneNumber || '',
            profilePicture: userData?.profilePicture || null,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfilePicture = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'You need to allow access to your media library to change profile picture.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        
        // Update locally
        setUserData(prev => ({ ...prev, profilePicture: imageUri }));
        
        // Update in AsyncStorage
        const user = await AsyncStorage.getItem('user');
        if (user) {
          const parsedUser = JSON.parse(user);
          await firestore().collection('users').doc(parsedUser.uid).update({
            profilePicture: imageUri,
          });
          
          parsedUser.profilePicture = imageUri;
          await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
        }
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              await auth().signOut();
              router.replace('/role-selection');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Account Settings',
      items: [
        { 
          icon: <User size={20} color="#374151" />, 
          label: 'Personal Information', 
          onPress: () => router.push('/settings/personal')
        },
        { 
          icon: <MapPin size={20} color="#374151" />, 
          label: 'Addresses', 
          onPress: () => router.push('/settings/addresses')
        },
        { 
          icon: <CreditCard size={20} color="#374151" />, 
          label: 'Payment Methods', 
          onPress: () => router.push('/settings/payment')
        },
      ]
    },
    {
      title: 'Shopping',
      items: [
        { 
          icon: <ShoppingBag size={20} color="#374151" />, 
          label: 'Orders', 
          onPress: () => router.push('/(buyer)/orders')
        },
        { 
          icon: <Heart size={20} color="#374151" />, 
          label: 'Saved Items', 
          onPress: () => router.push('/settings/saved')
        }
      ]
    },
    {
      title: 'Preferences',
      items: [
        { 
          icon: <Bell size={20} color="#374151" />, 
          label: 'Notifications', 
          onPress: () => router.push('/settings/notifications')
        },
        { 
          icon: <Settings size={20} color="#374151" />, 
          label: 'App Settings', 
          onPress: () => router.push('/settings/app')
        }
      ]
    },
    {
      title: 'Support',
      items: [
        { 
          icon: <HelpCircle size={20} color="#374151" />, 
          label: 'Help & FAQ', 
          onPress: () => router.push('/settings/help')
        },
        { 
          icon: <LogOut size={20} color="#F43F5E" />, 
          label: 'Logout', 
          onPress: handleLogout,
          textColor: '#F43F5E'
        }
      ]
    }
  ];

  const renderMenuItem = (item, index) => {
    return (
      <TouchableOpacity 
        key={index} 
        style={styles.menuItem}
        onPress={item.onPress}
      >
        <HStack style={styles.menuItemContent}>
          <HStack style={styles.menuItemLeft}>
            {item.icon}
            <Text style={[
              styles.menuItemLabel,
              item.textColor ? { color: item.textColor } : {}
            ]}>
              {item.label}
            </Text>
          </HStack>
          {item.label !== 'Logout' && <ChevronRight size={20} color="#9CA3AF" />}
        </HStack>
      </TouchableOpacity>
    );
  };

  return (
    <Box style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with profile info */}
        <Box style={styles.header}>
          <TouchableOpacity style={styles.profileImageContainer} onPress={handleUpdateProfilePicture}>
            {userData.profilePicture ? (
              <Image
                source={{ uri: userData.profilePicture }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <User size={50} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </View>
          </TouchableOpacity>
          
          <Heading style={styles.userName}>{userData.name}</Heading>
          <Text style={styles.userContact}>{userData.phoneNumber}</Text>
          {userData.email && <Text style={styles.userContact}>{userData.email}</Text>}
          
          <TouchableOpacity style={styles.editProfileButton} onPress={() => router.push('/settings/personal')}>
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </Box>
        
        {/* Menu sections */}
        {menuItems.map((section, sectionIndex) => (
          <Box key={sectionIndex} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <Box style={styles.menuCard}>
              {section.items.map((item, itemIndex) => renderMenuItem(item, `${sectionIndex}-${itemIndex}`))}
            </Box>
          </Box>
        ))}
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    paddingTop: 80,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  editBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userContact: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  editProfileButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
  },
  editProfileButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  menuSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemLabel: {
    marginLeft: 12,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 16,
    color: '#9CA3AF',
    fontSize: 12,
  }
});