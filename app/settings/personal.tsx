'use client';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { FormControl, FormControlHelper, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function PersonalInformationScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
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
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      const user = await AsyncStorage.getItem('user');
      if (user) {
        const parsedUser = JSON.parse(user);
        await firestore().collection('users').doc(parsedUser.uid).update({
          name: userData.name,
          email: userData.email,
        });
        
        // Update AsyncStorage
        parsedUser.name = userData.name;
        parsedUser.email = userData.email;
        await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
        
        Alert.alert('Success', 'Personal information updated successfully.');
      }
    } catch (error) {
      console.error('Error updating user data:', error);
      Alert.alert('Error', 'Failed to update personal information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Heading style={styles.headerTitle}>Personal Information</Heading>
        <View style={styles.placeholder} />
      </View>
      
      <Box style={styles.content}>
        <VStack space="lg">
          <FormControl>
            <FormControlLabel>
              <FormControlLabelText>Full Name</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                placeholder="Enter your full name"
                value={userData.name}
                onChangeText={(value) => setUserData((prev) => ({ ...prev, name: value }))}
              />
            </Input>
          </FormControl>

          <FormControl>
            <FormControlLabel>
              <FormControlLabelText>Email Address</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                placeholder="Enter your email address"
                value={userData.email}
                onChangeText={(value) => setUserData((prev) => ({ ...prev, email: value }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Input>
          </FormControl>

          <FormControl isDisabled>
            <FormControlLabel>
              <FormControlLabelText>Phone Number</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                placeholder="Your phone number"
                value={userData.phoneNumber}
                editable={false}
              />
            </Input>
            <FormControlHelper>
              <Text style={styles.helperText}>Phone number cannot be changed</Text>
            </FormControlHelper>
          </FormControl>

          <Button
            size="lg"
            variant="solid"
            style={styles.saveButton}
            onPress={handleSave}
            isDisabled={isLoading}
          >
            <ButtonText>Save Changes</ButtonText>
          </Button>
        </VStack>
      </Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#3B82F6',
  },
});
