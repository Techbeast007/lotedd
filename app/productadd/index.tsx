import { Button, ButtonText } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';

import { categories } from '@/assets/categories';
import { Box } from '@/components/ui/box';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage'; // Firebase Storage
import * as ImagePicker from 'expo-image-picker';
import { Image, TouchableOpacity } from 'react-native';
import uuid from 'react-native-uuid'; // For generating unique SKU-ID

const ProductAdd = () => {
    const [productName, setProductName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
    const [filteredCategories, setFilteredCategories] = useState(categories);
    const [images, setImages] = useState<string[]>([]);
    const [videos, setVideos] = useState<string[]>([]);
    const [sellerId, setSellerId] = useState('');
    const [showCategories, setShowCategories] = useState(false);
  
    // Fetch seller ID from local storage
    const fetchSellerId = async () => {
      const storedSellerId = await AsyncStorage.getItem('user');
      if (storedSellerId) {
        setSellerId(storedSellerId);
      } else {
        alert('Seller ID not found. Please log in.');
      }
    };
  
    // Handle category search
    const handleSearch = (query:any) => {
      setSearchQuery(query);
      const filtered = categories.filter((category) =>
        category.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCategories(filtered);
    };
  
    // Handle category selection
    const handleSelectCategory = (category:{ id: string; name: string } | null) => {
      setSelectedCategory(category);
      setSearchQuery(category ? category.name : ''); // Set the input value to the selected category name or empty if null
      setShowCategories(false); // Hide the dropdown after selection
    };
  

    const uploadFileToStorage = async (uri: any, folder: string) => {
        console.log(`Uploading file: ${uri} to folder: ${folder}`);
        const fileName = `${folder}/${uuid.v4()}`; // Generate UUID using react-native-uuid
        const reference = storage().ref(fileName);
        await reference.putFile(uri);
        const downloadURL = await reference.getDownloadURL();
        console.log(`File uploaded. Download URL: ${downloadURL}`);
        return downloadURL;
      };
  
    const handleAddProduct = async () => {
        console.log('Add Product button clicked');
        console.log('Product Name:', productName);
        console.log('Selected Category:', selectedCategory);
        console.log('Seller ID:', sellerId);
      
        if (!productName || !selectedCategory || !sellerId) {
          alert('Please fill all fields');
          return;
        }
      
        const skuId = `SKU-${uuid.v4().slice(0, 8).toUpperCase()}`; // Generate unique SKU-ID
      
        try {
          console.log('Uploading images...');
          const imageUrls = await Promise.all(
            images.map((uri) => uploadFileToStorage(uri, 'images'))
          );
          console.log('Image URLs:', imageUrls);
      
          console.log('Uploading videos...');
          const videoUrls = await Promise.all(
            videos.map((uri) => uploadFileToStorage(uri, 'videos'))
          );
          console.log('Video URLs:', videoUrls);
      
          console.log('Saving product to Firestore...');
          await firestore().collection('products').add({
            name: productName,
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name,
            sellerId: sellerId, // Save the seller ID
            images: imageUrls,
            videos: videoUrls,
            skuId: skuId, // Save the unique SKU-ID
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
      
          console.log('Product saved to Firestore successfully.');
          alert(`Product added successfully! SKU-ID: ${skuId}`);
          setProductName('');
          setSelectedCategory(null);
          setImages([]);
          setVideos([]);
        } catch (error) {
          console.error('Error saving product:', error);
          alert(`Failed to add product: ${error.message}`);
        }
      };



  
    // Handle image selection
// Handle image selection
const handleSelectImages = async () => {
    if (images.length >= 5) {
      alert('You can upload a maximum of 5 images.');
      return;
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Corrected to use MediaTypeOptions
      // allowsMultipleSelection: true, // Removed as it's not supported
      quality: 1,
    });
  
    if (!result.canceled) {
      const selectedImages = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...selectedImages].slice(0, 5)); // Limit to 5 images
    }
  };
  
  // Handle video selection
  const handleSelectVideos = async () => {
    if (videos.length >= 2) {
      alert('You can upload a maximum of 2 videos.');
      return;
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos, // Corrected to use MediaTypeOptions
      allowsMultipleSelection: true,
      quality: 1,
    });
  
    if (!result.canceled) {
      const selectedVideos = result.assets.map((asset) => asset.uri);
      setVideos((prev) => [...prev, ...selectedVideos].slice(0, 2)); // Limit to 2 videos
    }
  };
  
    useEffect(() => {
      fetchSellerId();
    }, []);
  
    return (
      <VStack className="flex-1 bg-gray-50">
        {/* Hero Section */}
        <Box
          className="h-40 bg-blue-100 rounded-b-lg flex items-center justify-center"
          style={{
            backgroundColor: '#E0F7FA', // Light blue color
          }}
        >
          <Text className="text-3xl font-bold text-blue-600">Add Product</Text>
        </Box>
  
        {/* Form Section */}
        <VStack className="p-6 space-y-6">
          {/* Product Name Input */}
          <Box>
            <Text className="text-lg font-semibold mb-2">Product Name</Text>
            <Input>
              <InputSlot className="pl-3">
                <InputField
                  placeholder="Enter product name"
                  value={productName}
                  onChangeText={setProductName}
                />
              </InputSlot>
            </Input>
          </Box>
  
          {/* Category Search Input */}
          <Box>
            <Text className="text-lg font-semibold mb-2">Category</Text>
            <Input>
              <InputSlot className="pl-3">
                <InputField
                  placeholder="Search categories"
                  value={searchQuery}
                  onFocus={() => setShowCategories(true)} // Show dropdown on focus
                  onChangeText={handleSearch}
                />
              </InputSlot>
            </Input>
  
            {/* Dropdown for Filtered Categories */}
            {showCategories && filteredCategories.length > 0 && (
              <Box className="border border-gray-300 rounded-md mt-2 bg-white max-h-40 overflow-y-auto">
                <FlatList
                  data={filteredCategories}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="p-2 border-b border-gray-200"
                      onPress={() => handleSelectCategory(item)}
                    >
                      <Text>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </Box>
            )}
          </Box>
  
          {/* Image Upload Section */}
          <Box>
            <Text className="text-lg font-semibold mb-2">Upload Images</Text>
            <TouchableOpacity
              className="border-dashed border-2 border-gray-300 rounded-md p-4 flex items-center justify-center"
              onPress={handleSelectImages}
            >
              <Text className="text-gray-500">Upload Images (Max: 5)</Text>
            </TouchableOpacity>
            <HStack className="space-x-2 mt-2">
              {images.map((uri, index) => (
                <Image
                  key={index}
                  source={{ uri }}
                  style={{ width: 50, height: 50, borderRadius: 8 }}
                />
              ))}
            </HStack>
          </Box>
  
          {/* Video Upload Section */}
          <Box>
            <Text className="text-lg font-semibold mb-2">Upload Videos</Text>
            <TouchableOpacity
              className="border-dashed border-2 border-gray-300 rounded-md p-4 flex items-center justify-center"
              onPress={handleSelectVideos}
            >
              <Text className="text-gray-500">Upload Videos (Max: 2)</Text>
            </TouchableOpacity>
            <HStack className="space-x-2 mt-2">
              {videos.map((uri, index) => (
                <Box key={index} className="w-12 h-12 bg-gray-300 rounded-md">
                  <Text className="text-center text-xs">Video {index + 1}</Text>
                </Box>
              ))}
            </HStack>
          </Box>
  
          {/* Add Product Button */}
          <Button onPress={handleAddProduct} className="mt-4">
            <ButtonText>Add Product</ButtonText>
          </Button>
        </VStack>
      </VStack>
    );
  };
  

export default ProductAdd;