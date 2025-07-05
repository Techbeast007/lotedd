'use client';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ArrowLeft, Briefcase, Edit2, Home, MapPin, Plus, Trash2 } from 'lucide-react-native';
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

// Types for address
interface Address {
  id: string;
  label: string;
  type: 'home' | 'work' | 'other';
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  altitude?: number;
  district?: string;
  subregion?: string;
  streetNumber?: string;
  name?: string;
  isoCountryCode?: string;
  timestamp?: number;
}

export default function AddressesScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string | null>(null);
  const [locationDetailsVisible, setLocationDetailsVisible] = useState(false);
  const [selectedAddressDetails, setSelectedAddressDetails] = useState<Address | null>(null);

  // New address state
  const [address, setAddress] = useState<Omit<Address, 'id'>>({
    label: '',
    type: 'home',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    isDefault: false,
  });

  useEffect(() => {
    fetchUserData();
    checkLocationPermission();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const user = await AsyncStorage.getItem('user');
      
      if (user) {
        const parsedUser = JSON.parse(user);
        setUserId(parsedUser.uid);
        
        // Fetch user's addresses
        const addressesSnapshot = await firestore()
          .collection('users')
          .doc(parsedUser.uid)
          .collection('addresses')
          .get();
          
        const fetchedAddresses: Address[] = [];
        addressesSnapshot.forEach(doc => {
          fetchedAddresses.push({
            id: doc.id,
            ...doc.data() as Omit<Address, 'id'>
          });
        });
        
        setAddresses(fetchedAddresses);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      Alert.alert('Error', 'Failed to load addresses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const handleGetAddressFromLocation = async () => {
    try {
      if (locationPermissionStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Location permission is needed to auto-fill your address.');
          return;
        }
      }

      setLoading(true);
      
      // Get more accurate location data with higher accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });
      
      const { 
        latitude, 
        longitude, 
        accuracy, 
        altitude 
      } = location.coords;
      
      // Get address from coordinates
      const geoAddress = await Location.reverseGeocodeAsync({ 
        latitude, 
        longitude 
      });
      
      if (geoAddress && geoAddress.length > 0) {
        const locationInfo = geoAddress[0];
        
        // Construct street address with street number if available
        let fullStreetAddress = '';
        if (locationInfo.streetNumber && locationInfo.street) {
          fullStreetAddress = `${locationInfo.streetNumber} ${locationInfo.street}`;
        } else if (locationInfo.street) {
          fullStreetAddress = locationInfo.street;
        } else if (locationInfo.name) {
          fullStreetAddress = locationInfo.name; // Some locations only have names
        }
        
        setAddress({
          ...address,
          addressLine1: fullStreetAddress,
          city: locationInfo.city || '',
          state: locationInfo.region || '',
          postalCode: locationInfo.postalCode || '',
          country: locationInfo.country || '',
          // Save extended location data
          latitude,
          longitude,
          accuracy: accuracy || undefined,
          altitude: altitude || undefined,
          district: locationInfo.district || '',
          subregion: locationInfo.subregion || '',
          streetNumber: locationInfo.streetNumber || '',
          name: locationInfo.name || '',
          isoCountryCode: locationInfo.isoCountryCode || '',
          timestamp: Date.now(),
        });
        
        // Close map modal if open
        setMapModalVisible(false);
      } else {
        Alert.alert('Location Error', 'Could not determine address from your location.');
      }
    } catch (error) {
      console.error('Error getting address from location:', error);
      Alert.alert('Error', 'Failed to get address from location. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const openMapSelector = () => {
    setMapModalVisible(true);
  };
  
  const handleMapSelection = async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      
      // Get address from coordinates selected in map
      const geoAddress = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (geoAddress && geoAddress.length > 0) {
        const locationInfo = geoAddress[0];
        
        // Construct street address with street number if available
        let fullStreetAddress = '';
        if (locationInfo.streetNumber && locationInfo.street) {
          fullStreetAddress = `${locationInfo.streetNumber} ${locationInfo.street}`;
        } else if (locationInfo.street) {
          fullStreetAddress = locationInfo.street;
        } else if (locationInfo.name) {
          fullStreetAddress = locationInfo.name; // Some locations only have names
        }
        
        setAddress({
          ...address,
          addressLine1: fullStreetAddress,
          city: locationInfo.city || '',
          state: locationInfo.region || '',
          postalCode: locationInfo.postalCode || '',
          country: locationInfo.country || '',
          // Save extended location data
          latitude,
          longitude,
          district: locationInfo.district || '',
          subregion: locationInfo.subregion || '',
          streetNumber: locationInfo.streetNumber || '',
          name: locationInfo.name || '',
          isoCountryCode: locationInfo.isoCountryCode || '',
          timestamp: Date.now(),
        });
      }
      
      setMapModalVisible(false);
    } catch (error) {
      console.error('Error getting address from map selection:', error);
      Alert.alert('Error', 'Failed to get address from map selection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openAddEditModal = (existingAddress?: Address) => {
    if (existingAddress) {
      setEditingAddress(existingAddress);
      setAddress({
        label: existingAddress.label,
        type: existingAddress.type,
        addressLine1: existingAddress.addressLine1,
        addressLine2: existingAddress.addressLine2 || '',
        city: existingAddress.city,
        state: existingAddress.state,
        postalCode: existingAddress.postalCode,
        country: existingAddress.country,
        isDefault: existingAddress.isDefault,
        latitude: existingAddress.latitude,
        longitude: existingAddress.longitude,
      });
    } else {
      setEditingAddress(null);
      setAddress({
        label: '',
        type: 'home',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        isDefault: addresses.length === 0, // Make default if first address
      });
    }
    
    setModalVisible(true);
  };

  const handleSaveAddress = async () => {
    try {
      if (!userId) return;
      
      // Validate required fields
      if (!address.addressLine1 || !address.city || !address.state || !address.postalCode) {
        Alert.alert('Missing Information', 'Please fill in all required address fields.');
        return;
      }

      setLoading(true);
      
      // Create label if not provided and ensure all fields are properly formatted
      const addressToSave = {
        ...address,
        label: address.label || `${address.type.charAt(0).toUpperCase() + address.type.slice(1)} Address`,
        // Ensure all location data is saved properly
        latitude: address.latitude !== undefined ? Number(address.latitude) : undefined,
        longitude: address.longitude !== undefined ? Number(address.longitude) : undefined,
        accuracy: address.accuracy !== undefined ? Number(address.accuracy) : undefined,
        altitude: address.altitude !== undefined ? Number(address.altitude) : undefined,
        timestamp: address.timestamp || Date.now(),
      };
      
      // If this is set to default, unset default on other addresses
      if (addressToSave.isDefault) {
        const batch = firestore().batch();
        
        addresses.forEach(existingAddr => {
          if (existingAddr.isDefault && (!editingAddress || existingAddr.id !== editingAddress.id)) {
            const addrRef = firestore()
              .collection('users')
              .doc(userId)
              .collection('addresses')
              .doc(existingAddr.id);
              
            batch.update(addrRef, { isDefault: false });
          }
        });
        
        await batch.commit();
      }

      // Add or update address
      if (editingAddress) {
        // Update existing address
        await firestore()
          .collection('users')
          .doc(userId)
          .collection('addresses')
          .doc(editingAddress.id)
          .update(addressToSave);
          
        // Update addresses list
        setAddresses(addresses.map(addr => 
          addr.id === editingAddress.id 
            ? { ...addressToSave, id: editingAddress.id } 
            : addr
        ));
      } else {
        // Add new address
        const id = uuid.v4().toString();
        await firestore()
          .collection('users')
          .doc(userId)
          .collection('addresses')
          .doc(id)
          .set(addressToSave);
          
        // Update addresses list
        setAddresses([...addresses, { ...addressToSave, id }]);
      }
      
      setModalVisible(false);
      setEditingAddress(null);
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = (addressId: string) => {
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
              if (!userId) return;
              
              setLoading(true);
              
              // Delete from Firestore
              await firestore()
                .collection('users')
                .doc(userId)
                .collection('addresses')
                .doc(addressId)
                .delete();
                
              // Update local state
              setAddresses(addresses.filter(addr => addr.id !== addressId));
              
              // If deleted address was default and we have other addresses, make first one default
              const deletedAddress = addresses.find(addr => addr.id === addressId);
              if (deletedAddress?.isDefault && addresses.length > 1) {
                const newDefaultId = addresses.find(addr => addr.id !== addressId)?.id;
                if (newDefaultId) {
                  await firestore()
                    .collection('users')
                    .doc(userId)
                    .collection('addresses')
                    .doc(newDefaultId)
                    .update({ isDefault: true });
                    
                  setAddresses(prev => 
                    prev.map(addr => addr.id === newDefaultId 
                      ? { ...addr, isDefault: true } 
                      : addr
                    )
                  );
                }
              }
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      if (!userId) return;
      
      setLoading(true);
      
      const batch = firestore().batch();
      
      // Set selected address as default
      batch.update(
        firestore().collection('users').doc(userId).collection('addresses').doc(addressId),
        { isDefault: true }
      );
      
      // Unset default on all other addresses
      addresses.forEach(addr => {
        if (addr.id !== addressId && addr.isDefault) {
          batch.update(
            firestore().collection('users').doc(userId).collection('addresses').doc(addr.id),
            { isDefault: false }
          );
        }
      });
      
      await batch.commit();
      
      // Update local state
      setAddresses(prev => 
        prev.map(addr => ({
          ...addr,
          isDefault: addr.id === addressId
        }))
      );
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert('Error', 'Failed to set default address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render address icon based on type
  const renderAddressIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home size={20} color="#3B82F6" />;
      case 'work':
        return <Briefcase size={20} color="#3B82F6" />;
      default:
        return <MapPin size={20} color="#3B82F6" />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Heading style={styles.headerTitle}>My Addresses</Heading>
        <View style={styles.placeholder} />
      </View>
      
      <Box style={styles.content}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        )}
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Address List */}
          {addresses.length > 0 ? (
            <View style={styles.addressList}>
              {addresses.map((addr) => (
                <View key={addr.id} style={styles.addressCard}>
                  <HStack space="md" style={styles.addressHeader}>
                    <Box style={styles.addressIconContainer}>
                      {renderAddressIcon(addr.type)}
                    </Box>
                    <VStack style={{flex: 1}}>
                      <HStack style={{justifyContent: "space-between"}}>
                        <Text style={styles.addressLabel}>{addr.label}</Text>
                        {addr.isDefault && (
                          <Box style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </Box>
                        )}
                      </HStack>
                      <Text style={styles.addressText}>{addr.addressLine1}</Text>
                      {addr.addressLine2 && <Text style={styles.addressText}>{addr.addressLine2}</Text>}
                      <Text style={styles.addressText}>
                        {addr.city}, {addr.state} {addr.postalCode}
                      </Text>
                      <Text style={styles.addressText}>{addr.country}</Text>
                      {addr.latitude && addr.longitude && (
                        <TouchableOpacity 
                          onPress={() => {
                            setSelectedAddressDetails(addr);
                            setLocationDetailsVisible(true);
                          }}
                        >
                          <Text style={styles.coordsText}>
                            GPS: {addr.latitude.toFixed(6)}, {addr.longitude.toFixed(6)} ℹ️
                          </Text>
                        </TouchableOpacity>
                      )}
                    </VStack>
                  </HStack>
                  
                  <Divider style={[styles.divider, {marginVertical: 12}]} />
                  
                  <HStack style={{justifyContent: "space-between"}}>
                    <TouchableOpacity 
                      style={styles.addressAction}
                      onPress={() => handleDeleteAddress(addr.id)}
                    >
                      <Trash2 size={18} color="#EF4444" />
                      <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.addressAction}
                      onPress={() => openAddEditModal(addr)}
                    >
                      <Edit2 size={18} color="#3B82F6" />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    
                    {!addr.isDefault && (
                      <TouchableOpacity 
                        style={styles.addressAction}
                        onPress={() => handleSetDefaultAddress(addr.id)}
                      >
                        <Icon as={Home} size="sm" color="#3B82F6" />
                        <Text style={styles.actionText}>Set as Default</Text>
                      </TouchableOpacity>
                    )}
                  </HStack>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MapPin size={50} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Addresses Yet</Text>
              <Text style={styles.emptyStateText}>
                Add your delivery address to streamline your checkout process.
              </Text>
            </View>
          )}
        </ScrollView>
      </Box>
      
      {/* Add Address Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => openAddEditModal()}>
        <HStack space="sm" style={{alignItems: "center"}}>
          <Plus size={20} color="white" />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </HStack>
      </TouchableOpacity>

      {/* Add/Edit Address Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Address Type Selection */}
              <Text style={styles.inputLabel}>Address Type</Text>
              <HStack space="sm" style={styles.addressTypeContainer}>
                {['home', 'work', 'other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.addressTypeButton,
                      address.type === type && styles.addressTypeButtonActive
                    ]}
                    onPress={() => setAddress({...address, type: type as 'home' | 'work' | 'other'})}
                  >
                    <Text style={[
                      styles.addressTypeText,
                      address.type === type && styles.addressTypeTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </HStack>
              
              {/* Label */}
              <Text style={styles.inputLabel}>Label (optional)</Text>
              <TextInput
                style={styles.input}
                value={address.label}
                onChangeText={(text) => setAddress({...address, label: text})}
                placeholder="E.g. My Home, Office, etc."
              />
              
              {/* Current Location Buttons */}
              <HStack space="md" style={styles.locationButtonContainer}>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={handleGetAddressFromLocation}
                >
                  <MapPin size={18} color="#3B82F6" />
                  <Text style={styles.locationButtonText}>Use Current Location</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={openMapSelector}
                >
                  <MapPin size={18} color="#3B82F6" />
                  <Text style={styles.locationButtonText}>Select on Map</Text>
                </TouchableOpacity>
              </HStack>
              
              {/* Address Line 1 */}
              <Text style={styles.inputLabel}>Address Line 1 *</Text>
              <TextInput
                style={styles.input}
                value={address.addressLine1}
                onChangeText={(text) => setAddress({...address, addressLine1: text})}
                placeholder="Street address, building name"
              />
              
              {/* Address Line 2 */}
              <Text style={styles.inputLabel}>Address Line 2 (optional)</Text>
              <TextInput
                style={styles.input}
                value={address.addressLine2}
                onChangeText={(text) => setAddress({...address, addressLine2: text})}
                placeholder="Apartment, suite, unit, etc."
              />
              
              {/* City */}
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.input}
                value={address.city}
                onChangeText={(text) => setAddress({...address, city: text})}
                placeholder="City name"
              />
              
              <HStack space="md" style={styles.rowInputs}>
                {/* State/Province */}
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>State/Province *</Text>
                  <TextInput
                    style={styles.input}
                    value={address.state}
                    onChangeText={(text) => setAddress({...address, state: text})}
                    placeholder="State"
                  />
                </View>
                
                {/* Postal Code */}
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Postal Code *</Text>
                  <TextInput
                    style={styles.input}
                    value={address.postalCode}
                    onChangeText={(text) => setAddress({...address, postalCode: text})}
                    placeholder="Postal code"
                  />
                </View>
              </HStack>
              
              {/* Country */}
              <Text style={styles.inputLabel}>Country *</Text>
              <TextInput
                style={styles.input}
                value={address.country}
                onChangeText={(text) => setAddress({...address, country: text})}
                placeholder="Country"
              />
              
              {/* Default Address Toggle */}
              <TouchableOpacity
                style={styles.defaultToggle}
                onPress={() => setAddress({...address, isDefault: !address.isDefault})}
              >
                <View style={[
                  styles.checkbox,
                  address.isDefault && styles.checkboxActive
                ]}>
                  {address.isDefault && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.checkboxLabel}>
                  Set as default address
                </Text>
              </TouchableOpacity>
              
              {/* Save Button */}
              <Button
                style={styles.saveButton}
                onPress={handleSaveAddress}
                disabled={loading}
              >
                <HStack style={{alignItems: 'center', justifyContent: 'center', width: '100%'}}>
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : 'Save Address'}
                  </Text>
                </HStack>
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Map Selection Modal */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setMapModalVisible(false)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setMapModalVisible(false)} style={styles.backButton}>
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>Select Location</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.mapContainer}>
            {currentLocation ? (
              <WebView
                style={styles.webview}
                source={{
                  uri: `https://www.google.com/maps/search/?api=1&query=${currentLocation.latitude},${currentLocation.longitude}`
                }}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data && data.latitude && data.longitude) {
                      handleMapSelection(data.latitude, data.longitude);
                    }
                  } catch (e) {
                    console.error('Error processing map data:', e);
                  }
                }}
                injectedJavaScript={`
                  // This would be the place for a script to capture map clicks
                  // For a real implementation, you would need to integrate with the Maps API properly
                  // This is a simplified example
                  document.addEventListener('click', function(e) {
                    window.ReactNativeWebView.postMessage(
                      JSON.stringify({
                        latitude: ${currentLocation.latitude}, 
                        longitude: ${currentLocation.longitude}
                      })
                    );
                  });
                  true;
                `}
              />
            ) : (
              <View style={styles.mapPlaceholder}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.mapPlaceholderText}>Loading map...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.mapFooter}>
            <TouchableOpacity 
              style={styles.useLocationButton}
              onPress={() => {
                if (currentLocation) {
                  handleMapSelection(currentLocation.latitude, currentLocation.longitude);
                }
              }}
            >
              <Text style={styles.useLocationButtonText}>Use This Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Location Details Modal */}
      <Modal
        visible={locationDetailsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLocationDetailsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.detailsModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Location Details</Text>
              <TouchableOpacity onPress={() => setLocationDetailsVisible(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {selectedAddressDetails && (
                <>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Address</Text>
                    <Text style={styles.detailsValue}>{selectedAddressDetails.label}</Text>
                  </View>
                  
                  <Divider style={[styles.divider, {marginVertical: 12}]} />

                  {selectedAddressDetails.latitude && selectedAddressDetails.longitude && (
                    <>
                      <View style={styles.detailsRow}>
                        <Text style={styles.detailsLabel}>Latitude</Text>
                        <Text style={styles.detailsValue}>{selectedAddressDetails.latitude}</Text>
                      </View>
                      
                      <View style={styles.detailsRow}>
                        <Text style={styles.detailsLabel}>Longitude</Text>
                        <Text style={styles.detailsValue}>{selectedAddressDetails.longitude}</Text>
                      </View>
                    </>
                  )}
                  
                  {selectedAddressDetails.accuracy && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Accuracy</Text>
                      <Text style={styles.detailsValue}>{selectedAddressDetails.accuracy} meters</Text>
                    </View>
                  )}
                  
                  {selectedAddressDetails.altitude && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Altitude</Text>
                      <Text style={styles.detailsValue}>{selectedAddressDetails.altitude} meters</Text>
                    </View>
                  )}
                  
                  {selectedAddressDetails.district && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>District</Text>
                      <Text style={styles.detailsValue}>{selectedAddressDetails.district}</Text>
                    </View>
                  )}
                  
                  {selectedAddressDetails.subregion && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Subregion</Text>
                      <Text style={styles.detailsValue}>{selectedAddressDetails.subregion}</Text>
                    </View>
                  )}
                  
                  {selectedAddressDetails.timestamp && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Timestamp</Text>
                      <Text style={styles.detailsValue}>
                        {new Date(selectedAddressDetails.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => {
                      setLocationDetailsVisible(false);
                      if (selectedAddressDetails.latitude && selectedAddressDetails.longitude) {
                        setCurrentLocation({
                          latitude: selectedAddressDetails.latitude,
                          longitude: selectedAddressDetails.longitude
                        });
                        setMapModalVisible(true);
                      }
                    }}
                  >
                    <MapPin size={18} color="#FFFFFF" />
                    <Text style={styles.mapButtonText}>View on Map</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressList: {
    gap: 16,
    marginBottom: 80,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  addressHeader: {
    alignItems: 'flex-start',
  },
  addressIconContainer: {
    backgroundColor: '#EBF5FF',
    padding: 10,
    borderRadius: 8,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 1,
  },
  coordsText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  divider: {
    backgroundColor: '#F3F4F6',
  },
  addressAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 6,
  },
  actionText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteText: {
    color: '#EF4444',
  },
  defaultBadge: {
    backgroundColor: '#EBF5FF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  addressTypeContainer: {
    marginVertical: 12,
  },
  addressTypeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  addressTypeButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EBF5FF',
  },
  addressTypeText: {
    fontSize: 14,
    color: '#4B5563',
  },
  addressTypeTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  rowInputs: {
    width: '100%',
  },
  halfInput: {
    flex: 1,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#4B5563',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
    minHeight: 52,
    width: '100%',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  locationButtonContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
    gap: 8,
  },
  locationButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  mapHeader: {
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
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  webview: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    marginTop: 12,
    color: '#6B7280',
  },
  mapFooter: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  useLocationButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  useLocationButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Location details modal styles
  detailsModalContent: {
    maxHeight: '70%',
    borderRadius: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  detailsValue: {
    fontSize: 14,
    color: '#1F2937',
    maxWidth: '60%',
    textAlign: 'right',
  },
  mapButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
