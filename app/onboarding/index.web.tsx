'use client';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';

export default function OnboardingScreen() {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  useEffect(() => {
    // Fetch the role from localStorage
    const storedRole = localStorage.getItem('primaryRole');
    setRole(storedRole);
  }, []);

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      const fileURL = URL.createObjectURL(selectedFile);
      setProfilePicture(fileURL);
    }
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('User not logged in');
        return;
      }

      let profilePictureURL = profilePicture;

      // Upload profile picture to Firebase Storage
      if (file) {
        const storageRef = ref(storage, `profilePictures/${user.uid}`);
        await uploadBytes(storageRef, file);
        profilePictureURL = await getDownloadURL(storageRef);
      }

      const userData: any = {
        name,
        email,
        profilePicture: profilePictureURL,
      };

      if (role === 'seller') {
        userData.gstNumber = gstNumber;
      }

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), userData);

      console.log('User data saved successfully:', userData);
      alert('Profile updated successfully!');
      router.push('/(tabs)');
    } catch (error) {
      console.error('Error saving user data:', error);
      alert('Failed to save profile. Please try again.');
    }
  };

  return (
    <Box className="flex-1 bg-gray-50 justify-center items-center px-4 py-6">
      <VStack className="w-full max-w-[400px] p-6 bg-white rounded-lg shadow-md">
        <Heading size="lg" className="mb-4 text-left font-bold">
          Complete Your Profile
        </Heading>

        {/* Profile Picture Upload */}
        <label htmlFor="profilePictureUpload">
          <Box
            className="w-[100px] h-[100px] rounded-full bg-gray-200 flex justify-center items-center mb-6 cursor-pointer overflow-hidden"
          >
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <Text className="text-gray-500">Upload</Text>
            )}
          </Box>
        </label>
        <input
          id="profilePictureUpload"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleProfilePictureUpload}
        />

{/* Name Input */}
<Input className="mb-4">
  <InputField placeholder="Enter your name" />
  <InputSlot>
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      style={{ display: 'none' }} // Hide the native input if needed
    />
  </InputSlot>
</Input>

{/* Email Input */}
<Input className="mb-4">
  <InputField placeholder="Enter your email" type="text" />
  <InputSlot>
    <input
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      style={{ display: 'none' }} // Hide the native input if needed
    />
  </InputSlot>
</Input>

{/* GST Number Input (Only for Sellers) */}
{role === 'seller' && (
  <Input className="mb-4">
    <InputField placeholder="Enter your GST number" />
    <InputSlot>
      <input
        value={gstNumber}
        onChange={(e) => setGstNumber(e.target.value)}
        style={{ display: 'none' }} // Hide the native input if needed
      />
    </InputSlot>
  </Input>
)}

        {/* Save Button */}
        <Button className="bg-blue-500" onPress={handleSave}>
          <ButtonText className="text-white">Save</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}