import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ArrowLeft, Briefcase, Edit2, Home, MapPin, Plus, Trash2, Warehouse } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import uuid from 'react-native-uuid';
import { WebView } from 'react-native-webview';

// Types for seller address
interface SellerAddress {
  id: string;
  label: string;
  type: 'warehouse' | 'office' | 'shop' | 'factory' | 'other';
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  gstRegisteredAt?: boolean;
  isPickupLocation?: boolean;
  latitude?: number;
  longitude?: number;
  district?: string;
  subregion?: string;
  streetNumber?: string;
  name?: string;
  isoCountryCode?: string;
  timestamp?: number;
}

export default function SellerAddressesScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<SellerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SellerAddress | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [gettingLocation, setGettingLocation] = useState<boolean>(false);
  const [showMapWebView, setShowMapWebView] = useState<boolean>(false);
  const [mapLocation, setMapLocation] = useState<{lat: number; lng: number} | null>(null);
  const [selectedAddressDetails, setSelectedAddressDetails] = useState<SellerAddress | null>(null);

  // New address state
  const [address, setAddress] = useState<Omit<SellerAddress, 'id'>>({
    label: '',
    type: 'warehouse',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false,
    gstRegisteredAt: false,
    isPickupLocation: true
  });

  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    };
    
    checkPermission();
    
    // Get user ID from AsyncStorage
    const getUserIdAndAddresses = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const { uid } = JSON.parse(userData);
          setUserId(uid);
          
          // Fetch user's addresses
          await fetchAddresses(uid);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };
    
    getUserIdAndAddresses();
  }, []);

  // Fetch addresses for the user
  const fetchAddresses = async (uid: string) => {
    try {
      setLoading(true);
      const addressesSnapshot = await firestore()
        .collection('users')
        .doc(uid)
        .collection('addresses')
        .orderBy('timestamp', 'desc')
        .get();
      
      const fetchedAddresses: SellerAddress[] = [];
      addressesSnapshot.forEach(doc => {
        fetchedAddresses.push({ id: doc.id, ...doc.data() } as SellerAddress);
      });
      
      setAddresses(fetchedAddresses);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load addresses. Please try again later.');
    }
  };

  // Rest of the component implementation (unchanged)
  // ...

  // Add a new address
  const handleAddAddress = async () => {
    if (!userId) {
      Alert.alert('Error', 'You need to be logged in to add addresses');
      return;
    }
    
    if (!address.addressLine1 || !address.city || !address.state || !address.postalCode) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }
    
    try {
      const addressId = uuid.v4().toString();
      const timestamp = Date.now();
      
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('addresses')
        .doc(addressId)
        .set({
          ...address,
          timestamp,
        });
      
      // If this is the first address or set as default, update user's default address
      if (address.isDefault || addresses.length === 0) {
        await firestore()
          .collection('users')
          .doc(userId)
          .update({
            defaultAddress: {
              id: addressId,
              addressLine1: address.addressLine1,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country
            }
          });
      }
      
      // Reset form
      setAddress({
        label: '',
        type: 'warehouse',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        isDefault: false,
        gstRegisteredAt: false,
        isPickupLocation: true
      });
      
      setModalVisible(false);
      
      // Refetch addresses
      await fetchAddresses(userId);
      
      Alert.alert('Success', 'Address added successfully');
    } catch (error) {
      console.error('Error adding address:', error);
      Alert.alert('Error', 'Failed to add address. Please try again.');
    }
  };

  // Update an existing address
  const handleUpdateAddress = async () => {
    if (!userId || !editingAddress) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      return;
    }
    
    if (!address.addressLine1 || !address.city || !address.state || !address.postalCode) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }
    
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('addresses')
        .doc(editingAddress.id)
        .update({
          ...address,
          timestamp: Date.now()
        });
      
      // If set as default, update user's default address
      if (address.isDefault) {
        await firestore()
          .collection('users')
          .doc(userId)
          .update({
            defaultAddress: {
              id: editingAddress.id,
              addressLine1: address.addressLine1,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country
            }
          });
      }
      
      setModalVisible(false);
      setEditingAddress(null);
      
      // Refetch addresses
      await fetchAddresses(userId);
      
      Alert.alert('Success', 'Address updated successfully');
    } catch (error) {
      console.error('Error updating address:', error);
      Alert.alert('Error', 'Failed to update address. Please try again.');
    }
  };

  // Delete an address
  const handleDeleteAddress = async (addressId: string) => {
    if (!userId) return;
    
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('users')
                .doc(userId)
                .collection('addresses')
                .doc(addressId)
                .delete();
              
              // Refetch addresses
              await fetchAddresses(userId);
              
              Alert.alert('Success', 'Address deleted successfully');
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Get current location
  const getCurrentLocation = async () => {
    if (!locationPermission) {
      Alert.alert(
        'Location Permission Required',
        'Please enable location permissions to use this feature',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings',
            onPress: () => Linking.openSettings()
          }
        ]
      );
      return;
    }
    
    try {
      setGettingLocation(true);
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (geocode.length > 0) {
        const locationData = geocode[0];
        setAddress(prev => ({
          ...prev,
          addressLine1: locationData.street ? `${locationData.name || ''} ${locationData.street}` : (locationData.name || ''),
          addressLine2: locationData.district || '',
          city: locationData.city || locationData.subregion || '',
          state: locationData.region || '',
          postalCode: locationData.postalCode || '',
          country: locationData.country || 'India',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          streetNumber: locationData.streetNumber,
          district: locationData.district,
          subregion: locationData.subregion,
          isoCountryCode: locationData.isoCountryCode
        }));
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get location. Please try again or enter manually.');
    } finally {
      setGettingLocation(false);
    }
  };

  // Edit an existing address
  const handleEditAddress = (addressItem: SellerAddress) => {
    setAddress({
      label: addressItem.label,
      type: addressItem.type,
      addressLine1: addressItem.addressLine1,
      addressLine2: addressItem.addressLine2 || '',
      city: addressItem.city,
      state: addressItem.state,
      postalCode: addressItem.postalCode,
      country: addressItem.country,
      isDefault: addressItem.isDefault,
      gstRegisteredAt: addressItem.gstRegisteredAt || false,
      isPickupLocation: addressItem.isPickupLocation || false,
      latitude: addressItem.latitude,
      longitude: addressItem.longitude
    });
    
    setEditingAddress(addressItem);
    setModalVisible(true);
  };

  // Set an address as default
  const setAsDefault = async (addressItem: SellerAddress) => {
    if (!userId) return;
    
    try {
      // Update the isDefault flag on all addresses
      const batch = firestore().batch();
      
      // Set all addresses as non-default
      addresses.forEach(addr => {
        if (addr.isDefault) {
          const addrRef = firestore().collection('users').doc(userId).collection('addresses').doc(addr.id);
          batch.update(addrRef, { isDefault: false });
        }
      });
      
      // Set the selected address as default
      const selectedAddrRef = firestore().collection('users').doc(userId).collection('addresses').doc(addressItem.id);
      batch.update(selectedAddrRef, { isDefault: true });
      
      // Update user's default address
      const userRef = firestore().collection('users').doc(userId);
      batch.update(userRef, {
        defaultAddress: {
          id: addressItem.id,
          addressLine1: addressItem.addressLine1,
          city: addressItem.city,
          state: addressItem.state,
          postalCode: addressItem.postalCode,
          country: addressItem.country
        }
      });
      
      await batch.commit();
      
      // Refetch addresses
      await fetchAddresses(userId);
      
      Alert.alert('Success', 'Default address updated');
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert('Error', 'Failed to update default address. Please try again.');
    }
  };

  // Show address details
  const showAddressDetails = (addressItem: SellerAddress) => {
    setSelectedAddressDetails(addressItem);
    setDetailsModalVisible(true);
  };

  // Render address card
  const renderAddressCard = (item: SellerAddress, index: number) => {
    const addressTypeIcon = () => {
      switch (item.type) {
        case 'warehouse':
          return <Warehouse size={18} color="#4F46E5" />;
        case 'office':
          return <Briefcase size={18} color="#4F46E5" />;
        case 'shop':
          return <Home size={18} color="#4F46E5" />;
        default:
          return <MapPin size={18} color="#4F46E5" />;
      }
    };
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.addressCard}
        onPress={() => showAddressDetails(item)}
      >
        <HStack style={styles.addressHeader}>
          <HStack style={styles.addressTypeContainer}>
            {addressTypeIcon()}
            <Text style={styles.addressTypeLabel}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </HStack>
          
          {item.isDefault && (
            <Box style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </Box>
          )}
        </HStack>
        
        <Text style={styles.addressLabel}>{item.label || 'Address'}</Text>
        
        <VStack style={styles.addressDetails}>
          <Text style={styles.addressText}>{item.addressLine1}</Text>
          {item.addressLine2 && <Text style={styles.addressText}>{item.addressLine2}</Text>}
          <Text style={styles.addressText}>
            {item.city}, {item.state} {item.postalCode}
          </Text>
          <Text style={styles.addressText}>{item.country}</Text>
        </VStack>
        
        <Divider style={styles.divider} />
        
        <HStack style={styles.addressActions}>
          <TouchableOpacity 
            style={styles.addressActionButton} 
            onPress={() => handleEditAddress(item)}
          >
            <Edit2 size={16} color="#4F46E5" />
            <Text style={styles.addressActionText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.addressActionButton} 
            onPress={() => handleDeleteAddress(item.id)}
          >
            <Trash2 size={16} color="#EF4444" />
            <Text style={[styles.addressActionText, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
          
          {!item.isDefault && (
            <TouchableOpacity 
              style={styles.addressActionButton} 
              onPress={() => setAsDefault(item)}
            >
              <Home size={16} color="#4F46E5" />
              <Text style={styles.addressActionText}>Set as Default</Text>
            </TouchableOpacity>
          )}
        </HStack>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Box style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Heading size="lg" style={styles.headerTitle}>Business Addresses</Heading>
        <Box style={styles.placeholder} />
      </Box>
      
      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {addresses.length > 0 ? (
            <VStack style={styles.addressList}>
              {addresses.map(renderAddressCard)}
            </VStack>
          ) : (
            <VStack style={styles.emptyContainer}>
              <MapPin size={64} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Addresses Found</Text>
              <Text style={styles.emptyText}>
                Add your business locations to ship products from
              </Text>
            </VStack>
          )}
          
          {/* Spacer at the bottom */}
          <Box style={{ height: 80 }} />
        </ScrollView>
      )}
      
      {/* Add Address FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingAddress(null);
          setAddress({
            label: '',
            type: 'warehouse',
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'India',
            isDefault: addresses.length === 0, // First address is default
            gstRegisteredAt: false,
            isPickupLocation: true
          });
          setModalVisible(true);
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* Address Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <HStack style={styles.modalHeader}>
              <Heading size="md">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </Heading>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <ArrowLeft size={24} color="#0F172A" />
              </TouchableOpacity>
            </HStack>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Address Form */}
              <VStack space={3}>
                {/* Label */}
                <VStack>
                  <Text style={styles.inputLabel}>Address Label</Text>
                  <TextInput 
                    style={styles.input}
                    value={address.label}
                    onChangeText={(text) => setAddress(prev => ({ ...prev, label: text }))}
                    placeholder="E.g., Main Warehouse, City Office"
                    placeholderTextColor="#94A3B8"
                  />
                </VStack>
                
                {/* Address Type */}
                <VStack>
                  <Text style={styles.inputLabel}>Address Type</Text>
                  <HStack style={styles.addressTypeSelector}>
                    {(['warehouse', 'office', 'shop', 'factory', 'other'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.addressTypeOption,
                          address.type === type && styles.addressTypeOptionSelected
                        ]}
                        onPress={() => setAddress(prev => ({ ...prev, type }))}
                      >
                        <Text style={[
                          styles.addressTypeOptionText,
                          address.type === type && styles.addressTypeOptionTextSelected
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </HStack>
                </VStack>
                
                {/* Get Current Location Button */}
                <Button
                  variant="outline"
                  style={styles.locationButton}
                  onPress={getCurrentLocation}
                  disabled={gettingLocation}
                >
                  <HStack>
                    <MapPin size={18} color="#4F46E5" style={{marginRight: 8}} />
                    <ButtonText>
                      {gettingLocation ? 'Getting Location...' : 'Use Current Location'}
                    </ButtonText>
                  </HStack>
                </Button>
                
                {/* Address Line 1 */}
                <VStack>
                  <Text style={styles.inputLabel}>Address Line 1 *</Text>
                  <TextInput 
                    style={styles.input}
                    value={address.addressLine1}
                    onChangeText={(text) => setAddress(prev => ({ ...prev, addressLine1: text }))}
                    placeholder="Street address, building name"
                    placeholderTextColor="#94A3B8"
                  />
                </VStack>
                
                {/* Address Line 2 */}
                <VStack>
                  <Text style={styles.inputLabel}>Address Line 2</Text>
                  <TextInput 
                    style={styles.input}
                    value={address.addressLine2}
                    onChangeText={(text) => setAddress(prev => ({ ...prev, addressLine2: text }))}
                    placeholder="Apartment, suite, unit, etc. (optional)"
                    placeholderTextColor="#94A3B8"
                  />
                </VStack>
                
                {/* City */}
                <VStack>
                  <Text style={styles.inputLabel}>City *</Text>
                  <TextInput 
                    style={styles.input}
                    value={address.city}
                    onChangeText={(text) => setAddress(prev => ({ ...prev, city: text }))}
                    placeholder="City"
                    placeholderTextColor="#94A3B8"
                  />
                </VStack>
                
                {/* State */}
                <VStack>
                  <Text style={styles.inputLabel}>State *</Text>
                  <TextInput 
                    style={styles.input}
                    value={address.state}
                    onChangeText={(text) => setAddress(prev => ({ ...prev, state: text }))}
                    placeholder="State"
                    placeholderTextColor="#94A3B8"
                  />
                </VStack>
                
                {/* Postal Code */}
                <VStack>
                  <Text style={styles.inputLabel}>Postal Code *</Text>
                  <TextInput 
                    style={styles.input}
                    value={address.postalCode}
                    onChangeText={(text) => setAddress(prev => ({ ...prev, postalCode: text }))}
                    placeholder="Postal / ZIP code"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </VStack>
                
                {/* Country */}
                <VStack>
                  <Text style={styles.inputLabel}>Country *</Text>
                  <TextInput 
                    style={styles.input}
                    value={address.country}
                    onChangeText={(text) => setAddress(prev => ({ ...prev, country: text }))}
                    placeholder="Country"
                    placeholderTextColor="#94A3B8"
                    defaultValue="India"
                  />
                </VStack>
                
                {/* GST Registered Address */}
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setAddress(prev => ({ ...prev, gstRegisteredAt: !prev.gstRegisteredAt }))}
                >
                  <Box style={[
                    styles.checkbox,
                    address.gstRegisteredAt && styles.checkboxChecked
                  ]}>
                    {address.gstRegisteredAt && <Text style={styles.checkboxIcon}>✓</Text>}
                  </Box>
                  <Text style={styles.checkboxLabel}>
                    This is my GST registered address
                  </Text>
                </TouchableOpacity>
                
                {/* Pickup Location */}
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setAddress(prev => ({ ...prev, isPickupLocation: !prev.isPickupLocation }))}
                >
                  <Box style={[
                    styles.checkbox,
                    address.isPickupLocation && styles.checkboxChecked
                  ]}>
                    {address.isPickupLocation && <Text style={styles.checkboxIcon}>✓</Text>}
                  </Box>
                  <Text style={styles.checkboxLabel}>
                    This is a pickup location for orders
                  </Text>
                </TouchableOpacity>
                
                {/* Default Address */}
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setAddress(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                >
                  <Box style={[
                    styles.checkbox,
                    address.isDefault && styles.checkboxChecked
                  ]}>
                    {address.isDefault && <Text style={styles.checkboxIcon}>✓</Text>}
                  </Box>
                  <Text style={styles.checkboxLabel}>
                    Set as default address
                  </Text>
                </TouchableOpacity>
              </VStack>
              
              <Button
                style={styles.submitButton}
                onPress={editingAddress ? handleUpdateAddress : handleAddAddress}
              >
                <ButtonText>
                  {editingAddress ? 'Update Address' : 'Add Address'}
                </ButtonText>
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Address Details Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        {selectedAddressDetails && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <HStack style={styles.modalHeader}>
                <Heading size="md">Address Details</Heading>
                <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                  <ArrowLeft size={24} color="#0F172A" />
                </TouchableOpacity>
              </HStack>
              
              <ScrollView contentContainerStyle={styles.detailsModalContent}>
                {selectedAddressDetails.isDefault && (
                  <Box style={styles.detailsDefaultBadge}>
                    <Text style={styles.detailsDefaultText}>Default Address</Text>
                  </Box>
                )}
                
                <HStack style={styles.detailsTypeContainer}>
                  {selectedAddressDetails.type === 'warehouse' ? (
                    <Warehouse size={20} color="#4F46E5" />
                  ) : selectedAddressDetails.type === 'office' ? (
                    <Briefcase size={20} color="#4F46E5" />
                  ) : (
                    <MapPin size={20} color="#4F46E5" />
                  )}
                  
                  <Text style={styles.detailsTypeText}>
                    {selectedAddressDetails.type.charAt(0).toUpperCase() + selectedAddressDetails.type.slice(1)}
                  </Text>
                </HStack>
                
                <Text style={styles.detailsLabel}>{selectedAddressDetails.label || 'Address'}</Text>
                
                <VStack style={styles.fullAddressContainer}>
                  <Text style={styles.fullAddressText}>{selectedAddressDetails.addressLine1}</Text>
                  {selectedAddressDetails.addressLine2 && (
                    <Text style={styles.fullAddressText}>{selectedAddressDetails.addressLine2}</Text>
                  )}
                  <Text style={styles.fullAddressText}>
                    {selectedAddressDetails.city}, {selectedAddressDetails.state} {selectedAddressDetails.postalCode}
                  </Text>
                  <Text style={styles.fullAddressText}>{selectedAddressDetails.country}</Text>
                </VStack>
                
                <VStack style={styles.addressInfoContainer}>
                  {selectedAddressDetails.gstRegisteredAt && (
                    <HStack style={styles.addressInfoRow}>
                      <Box style={styles.infoIconContainer}>
                        <Text style={styles.infoIcon}>📝</Text>
                      </Box>
                      <Text style={styles.addressInfoText}>GST Registered Address</Text>
                    </HStack>
                  )}
                  
                  {selectedAddressDetails.isPickupLocation && (
                    <HStack style={styles.addressInfoRow}>
                      <Box style={styles.infoIconContainer}>
                        <Text style={styles.infoIcon}>📦</Text>
                      </Box>
                      <Text style={styles.addressInfoText}>Order Pickup Location</Text>
                    </HStack>
                  )}
                </VStack>
                
                <HStack style={styles.detailsActionButtons}>
                  <Button
                    variant="outline"
                    style={styles.detailsActionButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      handleEditAddress(selectedAddressDetails);
                    }}
                  >
                    <ButtonText>Edit</ButtonText>
                  </Button>
                  
                  <Button
                    style={styles.detailsActionButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      if (!selectedAddressDetails.isDefault) {
                        setAsDefault(selectedAddressDetails);
                      }
                    }}
                    disabled={selectedAddressDetails.isDefault}
                  >
                    <ButtonText>
                      {selectedAddressDetails.isDefault ? 'Default Address' : 'Set as Default'}
                    </ButtonText>
                  </Button>
                </HStack>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
      
      {/* Map WebView (for future use) */}
      <Modal
        visible={showMapWebView}
        animationType="slide"
        onRequestClose={() => setShowMapWebView(false)}
      >
        <SafeAreaView style={{flex: 1}}>
          <HStack style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setShowMapWebView(false)}>
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.mapHeaderTitle}>Select Location</Text>
            <Box style={{width: 24}} />
          </HStack>
          
          {mapLocation && (
            <WebView
              source={{
                uri: `https://www.google.com/maps/search/?api=1&query=${mapLocation.lat},${mapLocation.lng}`
              }}
              style={{flex: 1}}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 300,
  },
  addressList: {
    width: '100%',
    gap: 16,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  addressTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4F46E5',
    marginLeft: 4,
  },
  defaultBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  addressDetails: {
    gap: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#4B5563',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#E2E8F0',
  },
  addressActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  addressActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressActionText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '50%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  addressTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  addressTypeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  addressTypeOptionSelected: {
    borderColor: '#4F46E5',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  addressTypeOptionText: {
    fontSize: 14,
    color: '#64748B',
  },
  addressTypeOptionTextSelected: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  locationButton: {
    borderColor: '#4F46E5',
    marginVertical: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkboxIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    marginTop: 24,
  },
  detailsModalContent: {
    padding: 16,
  },
  detailsDefaultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  detailsDefaultText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  detailsTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsTypeText: {
    fontSize: 14,
    color: '#4F46E5',
    marginLeft: 8,
    fontWeight: '500',
  },
  detailsLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  fullAddressContainer: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  fullAddressText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
  addressInfoContainer: {
    gap: 12,
    marginBottom: 24,
  },
  addressInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoIcon: {
    fontSize: 16,
  },
  addressInfoText: {
    fontSize: 14,
    color: '#334155',
  },
  detailsActionButtons: {
    gap: 12,
  },
  detailsActionButton: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
});
