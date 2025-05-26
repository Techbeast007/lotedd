import { Button, ButtonText } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';

import { categories } from '@/assets/categories';
import { Box } from '@/components/ui/box';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Image, TouchableOpacity } from 'react-native';
import uuid from 'react-native-uuid'; // For generating unique SKU-ID




const ProductAdd = () => {
    const [productName, setProductName] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Add isLoading state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
    const [filteredCategories, setFilteredCategories] = useState(categories);
    const [images, setImages] = useState<string[]>([]);
    const [videos, setVideos] = useState<string[]>([]);
    const [sellerId, setSellerId] = useState('');
    const [showCategories, setShowCategories] = useState(false);
    const [description, setDescription] = useState(''); // New state for description
    const [measurements, setMeasurements] = useState(''); // New state for measurements
    const firestore = getFirestore(); // Initialize Firestore
  const storage = getStorage(); // Initialize Storage
  
    // Fetch seller ID from local storage
    const fetchSellerId = async () => {
      const storedSellerId = await localStorage.getItem('user');
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
        const reference = ref(storage, fileName);
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(reference, blob);
        const downloadURL = await getDownloadURL(reference);
        console.log(`File uploaded. Download URL: ${downloadURL}`);
        return downloadURL;
      };
  
      const handleAddProduct = async () => {
        console.log('Add Product button clicked');
        console.log('Product Name:', productName);
        console.log('Description:', description);
        console.log('Measurements:', measurements);
        console.log('Selected Category:', selectedCategory);
        console.log('Seller ID:', sellerId);
    
        if (!productName || !description || !measurements || !selectedCategory || !sellerId) {
          alert('Please fill all fields');
          return;
        }
    
        const skuId = `SKU-${uuid.v4().slice(0, 8).toUpperCase()}`; // Generate unique SKU-ID
        setIsLoading(true); // Show loading spinner
    
        try {
          setIsLoading(true); // Show loading spinner
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
          await addDoc(collection(firestore, 'products'), {
            name: productName,
            description: description, // Save description
            measurements: measurements, // Save measurements
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name,
            sellerId: sellerId, // Save the seller ID
            images: imageUrls,
            videos: videoUrls,
            skuId: skuId, // Save the unique SKU-ID
            createdAt: serverTimestamp(),
          });
    
          console.log('Product saved to Firestore successfully.');
          alert(`Product added successfully! SKU-ID: ${skuId}`);
          setProductName('');
          setDescription('');
          setMeasurements('');
          setSelectedCategory(null);
          setImages([]);
          setVideos([]);
          setIsLoading(false); 
        } catch (error) {
          console.error('Error saving product:', error);
          if (error instanceof Error) {
            alert(`Failed to add product: ${error.message}`);
          } else {
            alert('Failed to add product: An unknown error occurred.');
          }
        } finally {
          setIsLoading(false); // Hide loading spinner
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
      <>
     
      <VStack className="flex-1 bg-gray-50">
        
        {/* Hero Section */}
        <Box
          className="h-40 bg-blue-100 rounded-b-lg flex items-left justify-end p-6"
          style={{
            backgroundColor: '#E0F7FA', // Light blue color
          }}
        >
            <Text className="text-3xl font-bold text-black-600 text-left">Add Product</Text>
        </Box>
  
        {/* Form Section */}
        <VStack className="p-8 space-y-8">
          {/* Product Name Input */}
          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Product Name</Text>
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
          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Category</Text>
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
              <Box className="border border-gray-300 rounded-md mt-4 bg-white max-h-40 overflow-y-auto">
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="p-3 border-b border-gray-200"
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
          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Upload Images</Text>
            <TouchableOpacity
              className="border-dashed border-2 border-gray-300 rounded-md p-6 flex items-center justify-center"
              onPress={handleSelectImages}
            >
              <Text className="text-gray-500">Upload Images (Max: 5)</Text>
            </TouchableOpacity>
            <HStack className="space-x-4 mt-4">
              {images.map((uri, index) => (
          <Image
            key={index}
            source={{ uri }}
            style={{ width: 60, height: 60, borderRadius: 8 }}
          />
              ))}
            </HStack>
          </Box>
           {/* Description Input */}
        <Box className="mb-7 space-y-8">
          <Text className="text-lg font-semibold mb-2">Description</Text>
          <Input>
            <InputSlot className="pl-3">
              <InputField
                placeholder="Enter product description"
                value={description}
                onChangeText={setDescription}
              />
            </InputSlot>
          </Input>
        </Box>

        {/* Measurements Input */}
        <Box  className="mb-7 space-y-8">
          <Text className="text-lg font-semibold mb-2">Measurements</Text>
          <Input>
            <InputSlot className="pl-3">
              <InputField
                placeholder="Enter measurements (e.g., weight, dimensions)"
                value={measurements}
                onChangeText={setMeasurements}
              />
            </InputSlot>
          </Input>
        </Box>
        
          {/* Video Upload Section */}
          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Upload Videos</Text>
            <TouchableOpacity
              className="border-dashed border-2 border-gray-300 rounded-md p-6 flex items-center justify-center"
              onPress={handleSelectVideos}
            >
              <Text className="text-gray-500">Upload Videos (Max: 2)</Text>
            </TouchableOpacity>
            <HStack className="space-x-4 mt-4">
              {videos.map((uri, index) => (
          <Box key={index} className="w-14 h-14 bg-gray-300 rounded-md flex items-center justify-center">
            <Text className="text-center text-xs">Video {index + 1}</Text>
          </Box>
              ))}
            </HStack>
          </Box>
        
          {/* Add Product Button */}
          <Button onPress={handleAddProduct} className="mt-6" disabled={isLoading}>
            {isLoading ? (
              <Spinner className="mr-2" />
            ) : (
              <ButtonText>Add Product</ButtonText>
            )}
          </Button>
        </VStack>
      </VStack></>
    );
  };
  

export default ProductAdd;