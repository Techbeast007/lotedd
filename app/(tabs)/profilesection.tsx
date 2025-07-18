import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { Camera, ChevronRight, CreditCard, Edit2, HelpCircle, LogOut, Mail, MapPin, Phone, Settings, ShieldCheck, User, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, TouchableOpacity } from "react-native";

// Define a reusable profile info item component
const ProfileInfoItem = ({ 
  icon, 
  title, 
  value, 
  onPress 
}: { 
  icon: React.ReactNode, 
  title: string, 
  value: string,
  onPress?: () => void
}) => {
  return (
    <Pressable onPress={onPress}>
      <HStack className="w-full items-center py-3">
        <Box className="h-10 w-10 rounded-full bg-blue-50 items-center justify-center mr-3">
          {icon}
        </Box>
        <VStack flex={1}>
          <Text className="text-sm font-medium text-gray-500">{title}</Text>
          <Text className="text-base font-semibold">{value}</Text>
        </VStack>
        <Box 
          className="h-8 w-8 rounded-full bg-gray-100 items-center justify-center"
        >
          <Edit2 size={16} color="#3B82F6" />
        </Box>
      </HStack>
    </Pressable>
  );
};

// Define a reusable menu item component
const MenuItem = ({ 
  icon, 
  label, 
  onPress,
  danger = false
}: { 
  icon: React.ReactNode, 
  label: string, 
  onPress: () => void,
  danger?: boolean 
}) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      className="w-full"
      activeOpacity={0.7}
    >
      <HStack className="w-full items-center py-4">
        <Box 
          className={`h-10 w-10 rounded-full items-center justify-center mr-3 ${
            danger ? 'bg-red-50' : 'bg-blue-50'
          }`}
        >
          {icon}
        </Box>
        <Text 
          className={`flex-1 text-base font-medium ${
            danger ? 'text-red-600' : 'text-gray-800'
          }`}
        >
          {label}
        </Text>
        <Box className="h-6 w-6 rounded-full bg-gray-100 items-center justify-center">
          <ChevronRight size={16} color={danger ? "#FF4040" : "#777"} />
        </Box>
      </HStack>
    </TouchableOpacity>
  );
};

// Edit profile modal component
const EditProfileModal = ({ 
  isVisible, 
  onClose,
  fieldName,
  fieldValue,
  fieldIcon,
  onSave
}: { 
  isVisible: boolean, 
  onClose: () => void,
  fieldName: string,
  fieldValue: string,
  fieldIcon: React.ReactNode,
  onSave: (value: string) => void
}) => {
  const [value, setValue] = useState(fieldValue);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(fieldValue);
  }, [fieldValue]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(value);
      onClose();
    } catch (error) {
      console.error("Error saving profile data:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isVisible} onClose={onClose}>
      <ModalBackdrop />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ width: "100%" }}
      >
        <ModalContent className="rounded-3xl w-full max-w-sm">
          <ModalHeader className="border-b border-gray-100">
            <HStack className="w-full items-center justify-between">
              <HStack className="items-center">
                <Box className="h-8 w-8 rounded-full bg-blue-100 items-center justify-center mr-2">
                  {fieldIcon}
                </Box>
                <Text className="font-semibold text-lg">Edit {fieldName}</Text>
              </HStack>
              <Pressable onPress={onClose}>
                <X size={22} color="#777" />
              </Pressable>
            </HStack>
          </ModalHeader>
          
          <ModalBody className="px-4 py-5">
            <Input className="mb-6">
              <InputSlot className="pl-3">
                <InputField
                  autoFocus
                  value={value}
                  onChangeText={setValue}
                  placeholder={`Enter your ${fieldName.toLowerCase()}`}
                />
              </InputSlot>
            </Input>
          </ModalBody>
          
          <ModalFooter className="border-t border-gray-100">
            <HStack className="space-x-2">
              <Button
                flex={1}
                variant="outline"
                onPress={onClose}
                className="border-gray-300"
              >
                <ButtonText className="text-gray-700">Cancel</ButtonText>
              </Button>
              <Button
                flex={1}
                onPress={handleSave}
                className="bg-blue-600"
                disabled={isSaving}
              >
                {isSaving ? (
                  <HStack className="items-center space-x-2">
                    <Spinner size="small" color="white" />
                    <ButtonText className="text-white">Saving...</ButtonText>
                  </HStack>
                ) : (
                  <ButtonText className="text-white">Save</ButtonText>
                )}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function ProfileSection() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("John Doe");
  const [userEmail, setUserEmail] = useState("john.doe@example.com");
  const [userPhone, setUserPhone] = useState("+1 234 567 890");
  const [userGst, setUserGst] = useState("22AAAAA0000A1Z5");
  const [userAddress, setUserAddress] = useState("123 Main St, New York, NY 10001");
  const [profileImage, setProfileImage] = useState<string>("https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80");
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [editField, setEditField] = useState<string>("");
  const [editValue, setEditValue] = useState<string>("");
  const [editFieldIcon, setEditFieldIcon] = useState<React.ReactNode>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // Load user data when component mounts
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Step 1: Get user ID and role from AsyncStorage
      const userDataString = await AsyncStorage.getItem('user');
      const roleValue = await AsyncStorage.getItem('currentRole');
      
      console.log('User data from storage:', userDataString);
      console.log('User role from storage:', roleValue);
      
      if (!userDataString) {
        console.log('No user data found in storage');
        Alert.alert("Warning", "You're not properly logged in. Please log out and log in again.");
        setIsLoading(false);
        return;
      }
      
      // Parse the user data to extract the actual UID
      const userData = JSON.parse(userDataString);
      const userIdValue = userData.uid;
      
      console.log('Extracted user ID:', userIdValue);
      
      // Set user ID and role in state
      setUserId(userIdValue);
      if (roleValue) {
        setCurrentUser(roleValue);
      } else {
        setCurrentUser('buyer');
      }
      
      // Step 2: Fetch user data from Firestore using the correct user ID
      const userDocRef = firestore().collection('users').doc(userIdValue);
      const userDoc = await userDocRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData) {
          console.log('User data found in Firestore:', userData);
          
          // Map the Firestore field names to our app's expected field names
          setUserName(userData.name || "");
          setUserEmail(userData.email || "");
          
          // Use phoneNumber field instead of phone
          setUserPhone(userData.phoneNumber || userData.phone || "+1 234 567 890");
          
          setUserAddress(userData.address || "");
          setUserGst(userData.gstNumber || "");
          
          // Use profilePicture field instead of profileImage
          if (userData.profilePicture) {
            setProfileImage(userData.profilePicture);
          } else if (userData.profileImage) {
            // Fallback to profileImage if it exists
            setProfileImage(userData.profileImage);
          }
        }
      } else {
        console.log('User document does not exist in Firestore, will create when updating');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert("Error", "Failed to load profile data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Logout", 
          onPress: () => {
            AsyncStorage.removeItem('user');
            router.push('/role-selection');
          },
          style: "destructive"
        }
      ]
    );
  };
  
  const updateUserField = async (field: string, value: string) => {
    if (!userId) {
      Alert.alert("Error", "You must be logged in to update your profile");
      return;
    }
    
    try {
      // Reference to the user document
      const userDocRef = firestore().collection('users').doc(userId);
      
      // Use set with merge option instead of checking existence and using update
      // This will create the document if it doesn't exist or update it if it does
      console.log(`Setting user document field ${field} = ${value}`);
      await userDocRef.set({
        [field]: value,
        updatedAt: firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      // Show success message to the user
      Alert.alert("Success", `Your ${field} has been updated successfully`);
      return true;
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      throw error;
    }
  };

  const handleEditPhoto = async () => {
    try {
      if (!userId) {
        Alert.alert("Error", "User ID not found. Please log in again.");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (result.canceled) return;
      
      const imageUri = result.assets[0].uri;
      setIsLoading(true);
      
      // Upload image to Firebase Storage
      const fileName = `profile_images/${userId}_${Date.now()}`;
      const reference = storage().ref(fileName);
      await reference.putFile(imageUri);
      const downloadURL = await reference.getDownloadURL();
      
      // Check if the user document exists first
      const userDocRef = firestore().collection('users').doc(userId);
      const userDoc = await userDocRef.get();
      
      if (userDoc.exists) {
        // Update existing document - use profilePicture instead of profileImage
        await userDocRef.update({
          profilePicture: downloadURL,
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Create new user document if it doesn't exist
        await userDocRef.set({
          profilePicture: downloadURL,
          name: userName,
          email: userEmail,
          phoneNumber: userPhone, // Use phoneNumber instead of phone
          address: userAddress,
          gstNumber: currentUser === 'seller' ? userGst : null,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          role: currentUser || 'buyer'
        });
      }
      
      setProfileImage(downloadURL);
      Alert.alert("Success", "Profile picture updated successfully");
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert("Error", "Failed to update profile picture. " + (error instanceof Error ? error.message : "Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (field: string, value: string, icon: React.ReactNode) => {
    setEditField(field);
    setEditValue(value);
    setEditFieldIcon(icon);
    setIsModalVisible(true);
  };
  
  const handleSaveField = async (newValue: string) => {
    try {
      if (!userId) {
        Alert.alert("Error", "You must be logged in to update your profile");
        return;
      }
      
      let fieldToUpdate = '';
      
      switch (editField) {
        case 'Name':
          fieldToUpdate = 'name';
          await updateUserField(fieldToUpdate, newValue);
          setUserName(newValue);
          break;
        case 'Email':
          fieldToUpdate = 'email';
          await updateUserField(fieldToUpdate, newValue);
          setUserEmail(newValue);
          break;
        case 'Phone':
          fieldToUpdate = 'phoneNumber'; // Changed from 'phone' to 'phoneNumber' to match Firestore schema
          await updateUserField(fieldToUpdate, newValue);
          setUserPhone(newValue);
          break;
        case 'Address':
          fieldToUpdate = 'address';
          await updateUserField(fieldToUpdate, newValue);
          setUserAddress(newValue);
          break;
        case 'GST Number':
          fieldToUpdate = 'gstNumber';
          await updateUserField(fieldToUpdate, newValue);
          setUserGst(newValue);
          break;
      }
    } catch (error) {
      console.error("Error saving profile data:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  const handleMenuAction = (action: string) => {
    // Implement menu actions based on the action type
    switch(action) {
      case 'Help & Support':
        if (currentUser === 'seller') {
          router.push('/settings/seller/help-support'); // Navigate to seller help page
        } else {
          router.push('/settings/help'); // Navigate to buyer help page
        }
        break;
      case 'Privacy & Security':
        Alert.alert("Privacy & Security", "Privacy & security settings will be available soon");
        break;
      case 'Settings':
        Alert.alert("Settings", "General settings will be available soon");
        break;
      default:
        Alert.alert(action, `${action} feature will be available soon`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header with profile photo */}
        <Box 
          className="w-full pt-6 pb-24 px-5 rounded-b-[40px]"
          style={{
            backgroundColor: '#2563EB',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <HStack className="justify-between items-center mb-8">
            <Text className="text-2xl font-bold text-white">My Profile</Text>
            <TouchableOpacity 
              onPress={() => handleMenuAction("Settings")}
              className="h-10 w-10 rounded-full bg-blue-500 items-center justify-center"
            >
              <Settings color="white" size={20} />
            </TouchableOpacity>
          </HStack>
          
          {/* Profile info with photo - removed View Profile button */}
          <HStack className="items-center">
            <Box className="relative">
              <Box
                style={{
                  padding: 3,
                  borderRadius: 100,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              >
                {isLoading ? (
                  <Box className="h-20 w-20 rounded-full items-center justify-center bg-blue-400">
                    <Spinner color="white" />
                  </Box>
                ) : (
                  <Image
                    source={{ uri: profileImage }}
                    className="h-20 w-20 rounded-full"
                    alt="Profile"
                  />
                )}
              </Box>
              <TouchableOpacity 
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#2563EB',
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: 'white',
                }}
                onPress={handleEditPhoto}
                disabled={isLoading}
              >
                <Camera size={16} color="white" />
              </TouchableOpacity>
            </Box>
            
            <VStack className="ml-4 flex-1">
              <Text className="text-xl font-bold text-white">{userName}</Text>
              <Text className="text-white opacity-80 mb-2">{userEmail}</Text>
              <HStack>
                <Box 
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 20,
                  }}
                >
                  <Text className="text-white font-medium text-xs">
                    {currentUser === 'seller' ? 'Seller Account' : 'Buyer Account'}
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </HStack>
        </Box>
        
        {/* Profile info card */}
        <Box 
          className="mx-5 bg-white rounded-3xl -mt-16 p-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 15,
            elevation: 3,
          }}
        >
          <Text className="font-bold text-xl mb-5 text-gray-800">Personal Information</Text>
          <VStack className="space-y-2">
            <ProfileInfoItem 
              icon={<User size={20} color="#3B82F6" />} 
              title="Full Name" 
              value={userName}
              onPress={() => openEditModal("Name", userName, <User size={20} color="#3B82F6" />)}
            />
            <Divider className="bg-gray-100" />
            
            <ProfileInfoItem 
              icon={<Mail size={20} color="#3B82F6" />} 
              title="Email" 
              value={userEmail}
              onPress={() => openEditModal("Email", userEmail, <Mail size={20} color="#3B82F6" />)}
            />
            <Divider className="bg-gray-100" />
            
            <HStack className="w-full items-center py-3">
              <Box className="h-10 w-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                <Phone size={20} color="#3B82F6" />
              </Box>
              <VStack className="flex-1">
                <Text className="text-sm font-medium text-gray-500">Phone</Text>
                <Text className="text-base font-semibold">{userPhone}</Text>
              </VStack>
              {/* Phone number editing disabled */}
              <Box 
                className="h-8 w-8 rounded-full bg-gray-100 items-center justify-center opacity-50"
              >
                <Text className="text-gray-500">🔒</Text>
              </Box>
            </HStack>
            <Divider className="bg-gray-100" />
            
            <ProfileInfoItem 
              icon={<MapPin size={20} color="#3B82F6" />} 
              title="Addresses" 
              value={userAddress || "Manage your addresses"}
              onPress={() => {
                if (currentUser === 'seller') {
                  router.push('/settings/seller/addresses'); // Navigate to seller addresses
                } else {
                  router.push('/settings/addresses'); // Navigate to buyer addresses
                }
              }}
            />
            
            {currentUser === 'seller' && (
              <>
                <Divider className="bg-gray-100" />
                <ProfileInfoItem 
                  icon={<CreditCard size={20} color="#3B82F6" />} 
                  title="GST Number" 
                  value={userGst}
                  onPress={() => openEditModal("GST Number", userGst, <CreditCard size={20} color="#3B82F6" />)}
                />
              </>
            )}
          </VStack>
        </Box>

        {/* Account Settings */}
        <Box className="mx-5 mt-6">
          <Text className="font-bold text-xl mb-4 text-gray-800">Account Settings</Text>
          <Box 
            className="bg-white rounded-3xl p-2"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 15,
              elevation: 3,
            }}
          >
            <VStack>
              <MenuItem 
                icon={<ShieldCheck size={20} color="#3B82F6" />}
                label="Privacy & Security" 
                onPress={() => handleMenuAction("Privacy & Security")}
              />
              <Divider className="bg-gray-100 ml-16" />
              
              <MenuItem 
                icon={<HelpCircle size={20} color="#3B82F6" />}
                label="Help & Support" 
                onPress={() => handleMenuAction("Help & Support")}
              />
              
              {/* Seller Settings removed */}
              
              <Divider className="bg-gray-100 ml-16" />
              <MenuItem 
                icon={<LogOut size={20} color="#FF4040" />}
                label="Logout" 
                onPress={handleLogout}
                danger
              />
            </VStack>
          </Box>
        </Box>
        
        {/* App version */}
        <HStack className="justify-center mt-8 mb-10">
          <Box 
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              paddingHorizontal: 15,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text className="text-blue-600 text-xs font-medium">App Version 1.0.0</Text>
          </Box>
        </HStack>
      </ScrollView>
      
      {/* Edit Profile Modal */}
      <EditProfileModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        fieldName={editField}
        fieldValue={editValue}
        fieldIcon={editFieldIcon}
        onSave={handleSaveField}
      />
    </SafeAreaView>
  );
}