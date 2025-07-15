import { Button, ButtonText } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';

import { categories } from '@/assets/categories';
import { Box } from '@/components/ui/box';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { ScrollView } from '@/components/ui/scroll-view';
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from "@/components/ui/select";
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage'; // Firebase Storage
import * as ImagePicker from 'expo-image-picker';
import { ChevronDownIcon } from 'lucide-react-native'; // Importing the icon for dropdown
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity
} from 'react-native';
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
    const [brand, setBrand] = useState(''); // New state for brand
    const [shortDescription, setShortDescription] = useState(''); // New state for short description
    const [basePrice, setBasePrice] = useState(''); // New state for base price
    const [size, setSize] = useState(''); // New state for size
    const [discountPrice, setDiscountPrice] = useState(''); // New state for discount price
    const [stockQuantity, setStockQuantity] = useState(''); // New state for stock quantity
    const [weight, setWeight] = useState(''); // New state for weight
    const [dimensions, setDimensions] = useState(''); // New state for dimensions
    const [color, setColor] = useState(''); // New state for color
    const [status, setStatus] = useState('live'); // New state for status
    const [featuredImage, setFeaturedImage] = useState<string | null>(null);
    
    // New state for seller product management
    const [manufacturingCost, setManufacturingCost] = useState('');
    const [sellingPricePerPiece, setSellingPricePerPiece] = useState('');
    const [wholeStockPrice, setWholeStockPrice] = useState('');


    const handleSelectFeaturedImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
    
      if (!result.canceled) {
        const selectedImage = result.assets[0].uri;
        setFeaturedImage(selectedImage); // Set the selected image as the featured image
      }
    };
  
    // Fetch seller ID from local storage
    const fetchSellerId = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('user');
        if (userDataString) {
          // Parse the user data and extract the uid
          const userData = JSON.parse(userDataString);
          setSellerId(userData.uid); // Set just the user ID, not the entire object
          console.log('Seller ID set:', userData.uid);
        } else {
          alert('Seller ID not found. Please log in.');
        }
      } catch (error) {
        console.error('Error fetching seller ID:', error);
        alert('Error retrieving your account information. Please log in again.');
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


      const resetForm = () => {
        setProductName('');
        setDescription('');
        setMeasurements('');
        setSelectedCategory(null);
        setImages([]);
        setVideos([]);
        setBrand('');
        setShortDescription('');
        setBasePrice('');
        setDiscountPrice('');
        setStockQuantity('');
        setSize('');
        setColor('');
        setWeight('');
        setDimensions('');
        setManufacturingCost('');
        setSellingPricePerPiece('');
        setWholeStockPrice('');
      };
  
      const handleAddProduct = async () => {
        if (!featuredImage) {
          alert('Please upload a featured image.');
          return;
        }
      
        setIsLoading(true);
      
        try {
          // Upload featured image
          const featuredImageUrl = await uploadFileToStorage(featuredImage, 'featured-images');
      
          // Upload other images
          const imageUrls = await Promise.all(
            images.map((uri) => uploadFileToStorage(uri, 'images'))
          );
      
          // Upload videos
          const videoUrls = await Promise.all(
            videos.map((uri) => uploadFileToStorage(uri, 'videos'))
          );
      
          // Validate required fields for seller
          if (!manufacturingCost || !sellingPricePerPiece || !stockQuantity) {
            alert('Please enter manufacturing cost, selling price per piece, and stock quantity');
            setIsLoading(false);
            return;
          }

          // Save product to Firestore
          await firestore().collection('products').add({
            name: productName,
            description: description,
            measurements: measurements || '',
            categoryId: selectedCategory?.id || '',
            categoryName: selectedCategory?.name || '',
            sellerId: sellerId,
            featuredImage: featuredImageUrl, // Add featured image URL
            images: imageUrls,
            videos: videoUrls || [],
            skuId: `SKU-${uuid.v4().slice(0, 8).toUpperCase()}`,
            brand: brand || '',
            status: status || 'live',
            shortDescription: shortDescription || '',
            basePrice: parseFloat(basePrice) || 0,
            discountPrice: parseFloat(discountPrice) || 0,
            stockQuantity: parseInt(stockQuantity) || 0,
            size: size || '',
            color: color || '',
            weight: parseFloat(weight) || 0,
            dimensions: dimensions || '',
            // New fields for seller product management
            manufacturingCost: parseFloat(manufacturingCost) || 0,
            sellingPricePerPiece: parseFloat(sellingPricePerPiece) || 0,
            wholeStockPrice: parseFloat(wholeStockPrice) || 0,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
      
          alert('Product added successfully!');
          resetForm();
        } catch (error) {
          console.error('Error saving product:', error);
          alert('Failed to add product.');
        } finally {
          setIsLoading(false);
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
        <GluestackUIProvider>
          <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0} // Adjust offset for iOS
  >
          <ScrollView
            className="flex-1 bg-white"
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 0, // give a bit of padding manually
              backgroundColor: 'white',
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
          {/* Basic Information */}
          {/* Product Name */}
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

          {/* Brand/Manufacturer */}
          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Brand/Manufacturer</Text>
            <Input>
              <InputSlot className="pl-3">
                <InputField
            placeholder="Enter brand/manufacturer"
            value={brand}
            onChangeText={setBrand}
                />
              </InputSlot>
            </Input>
          </Box>
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
            {showCategories && (
              <Box className="border border-gray-300 rounded-md mt-4 bg-white max-h-40 overflow-hidden">
                <ScrollView className="max-h-40" nestedScrollEnabled={true}>
            {filteredCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                className="p-3 border-b border-gray-200"
                onPress={() => handleSelectCategory(category)}
              >
                <Text>{category.name}</Text>
              </TouchableOpacity>
            ))}
                </ScrollView>
              </Box>
            )}
          </Box>

          {/* Descriptions */}
          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Descriptions</Text>
            <Input className="mb-4">
              <InputSlot className="pl-3">
                <InputField
            placeholder="Enter short description"
            value={shortDescription}
            onChangeText={setShortDescription}
                />
              </InputSlot>
            </Input>
            <Input>
              <InputSlot className="pl-3">
                <InputField
            placeholder="Enter long description"
            value={description}
            onChangeText={setDescription}
                />
              </InputSlot>
            </Input>
          </Box>

          {/* Media */}
          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Media</Text>
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

          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Featured Image</Text>
            <TouchableOpacity
              className="border-dashed border-2 border-gray-300 rounded-md p-6 flex items-center justify-center"
              onPress={handleSelectFeaturedImage}
            >
              <Text className="text-gray-500">Upload Featured Image</Text>
            </TouchableOpacity>
            {featuredImage && (
              <Image
                source={{ uri: featuredImage }}
                style={{ width: 100, height: 100, borderRadius: 8, marginTop: 10 }}
              />
            )}
          </Box>

          {/* Pricing & Availability */}
          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Pricing & Availability</Text>
            <VStack className="space-y-4">
              <Text className="text-md font-medium text-slate-700 mt-2">Manufacturing Cost (per piece)*</Text>
              <Input className="mb-2">
                <InputSlot className="pl-3">
                  <InputField
                    placeholder="Enter manufacturing cost per piece"
                    value={manufacturingCost}
                    onChangeText={setManufacturingCost}
                    keyboardType="numeric"
                  />
                </InputSlot>
              </Input>
              
              <Text className="text-md font-medium text-slate-700 mt-2">Selling Price (per piece)*</Text>
              <Input className="mb-2">
                <InputSlot className="pl-3">
                  <InputField
                    placeholder="Enter selling price per piece"
                    value={sellingPricePerPiece}
                    onChangeText={setSellingPricePerPiece}
                    keyboardType="numeric"
                  />
                </InputSlot>
              </Input>
              
              <Text className="text-md font-medium text-slate-700 mt-2">Base Price</Text>
              <Input className="mb-2">
                <InputSlot className="pl-3">
                  <InputField
                    placeholder="Enter base price"
                    value={basePrice}
                    onChangeText={setBasePrice}
                    keyboardType="numeric"
                  />
                </InputSlot>
              </Input>
              
              <Text className="text-md font-medium text-slate-700 mt-2">Discount Price (if any)</Text>
              <Input className="mb-2">
                <InputSlot>
                  <InputField
                    placeholder="Enter discount price (if any)"
                    value={discountPrice}
                    onChangeText={setDiscountPrice}
                    keyboardType="numeric"
                  />
                </InputSlot>
              </Input>
              
              <Text className="text-md font-medium text-slate-700 mt-2">Whole Stock Price (optional)</Text>
              <Input className="mb-2">
                <InputSlot className="pl-3">
                  <InputField
                    placeholder="Enter price for the entire stock (optional)"
                    value={wholeStockPrice}
                    onChangeText={setWholeStockPrice}
                    keyboardType="numeric"
                  />
                </InputSlot>
              </Input>
              
              <Text className="text-md font-medium text-slate-700 mt-2">Stock Quantity*</Text>
              <Input className="mb-2">
                <InputSlot className="pl-3">
                  <InputField
                    placeholder="Enter stock quantity"
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                    keyboardType="numeric"
                  />
                </InputSlot>
              </Input>
            </VStack>
          </Box>

          {/* Variants */}
          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Variants</Text>
            <Input className="mb-4">
              <InputSlot className="pl-3">
                <InputField
            placeholder="Enter size/weight"
            value={size}
            onChangeText={setSize}
                />
              </InputSlot>
            </Input>
            <Input className="mb-4">
              <InputSlot className="pl-3">
                <InputField
            placeholder="Enter color/material"
            value={color}
            onChangeText={setColor}
                />
              </InputSlot>
            </Input>
          </Box>

          {/* Logistics */}
          <Box className="mb-7 space-y-8">
            <Text className="text-xl font-bold mb-4">Logistics</Text>
            <Input className="mb-4">
              <InputSlot className="pl-3">
                <InputField
            placeholder="Enter weight"
            value={weight}
            onChangeText={setWeight}
                />
              </InputSlot>
            </Input>
            <Input className="mb-4">
              <InputSlot className="pl-3">
                <InputField
            placeholder="Enter dimensions (L x W x H)"
            value={dimensions}
            onChangeText={setDimensions}
                />
              </InputSlot>
            </Input>
            <Box className="mb-4"></Box>
            <Text className="text-xl font-bold mb-4">Status</Text>
            <Box>
              <Text className="text-lg font-medium mb-2">Status</Text>
              <Select onValueChange={setStatus} className="w-full">
                <SelectTrigger variant="outline" size="lg">
            <SelectInput placeholder="Select status" className="w-[90%] h-16" />
            <SelectIcon className="mr-3" as={ChevronDownIcon} />
                </SelectTrigger>
                <SelectPortal>
            <SelectBackdrop />
            <SelectContent>
              <SelectDragIndicatorWrapper>
                <SelectDragIndicator />
              </SelectDragIndicatorWrapper>
              <SelectItem label="Live" value="live" />
              <SelectItem label="Draft" value="draft" />
              <SelectItem label="Paused" value="paused" />
            </SelectContent>
                </SelectPortal>
              </Select>
            </Box>
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
            </VStack>
          </ScrollView></KeyboardAvoidingView>
        </GluestackUIProvider>
    );
  };
  

export default ProductAdd;