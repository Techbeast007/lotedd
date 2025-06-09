import { categories } from '@/assets/categories';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDownIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity
} from 'react-native';

const EditProduct = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // Get the product ID using Expo Router
  
  // States for product details
  const [productName, setProductName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [filteredCategories, setFilteredCategories] = useState(categories);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [sellerId, setSellerId] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [description, setDescription] = useState('');
  const [measurements, setMeasurements] = useState('');
  const [brand, setBrand] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [size, setSize] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [color, setColor] = useState('');
  const [status, setStatus] = useState('live');
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [skuId, setSkuId] = useState('');
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [originalVideos, setOriginalVideos] = useState<string[]>([]);

  // Fetch product data when component mounts
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const productDoc = await firestore().collection('products').doc(String(id)).get();
        
        if (!productDoc.exists) {
          console.error('Product not found');
          Alert.alert('Error', 'Product not found');
          router.push('/(tabs)/explore');
          return;
        }

        const data = productDoc.data();
        if (!data) return;

        // Set all the product data
        setProductName(data.name || '');
        setShortDescription(data.shortDescription || '');
        setDescription(data.description || '');
        setMeasurements(data.measurements || '');
        setBrand(data.brand || '');
        setBasePrice(data.basePrice?.toString() || '');
        setDiscountPrice(data.discountPrice?.toString() || '');
        setStockQuantity(data.stockQuantity?.toString() || '');
        setSize(data.size || '');
        setColor(data.color || '');
        setWeight(data.weight?.toString() || '');
        setDimensions(data.dimensions || '');
        setStatus(data.status || 'live');
        setSkuId(data.skuId || '');
        
        // Featured image
        if (data.featuredImage) {
          setFeaturedImage(data.featuredImage);
        }
        
        // Images and videos
        if (data.images && Array.isArray(data.images)) {
          setImages(data.images);
          setOriginalImages(data.images);
        }
        
        if (data.videos && Array.isArray(data.videos)) {
          setVideos(data.videos);
          setOriginalVideos(data.videos);
        }
        
        // Category
        if (data.categoryId && data.categoryName) {
          setSelectedCategory({ id: data.categoryId, name: data.categoryName });
          setSearchQuery(data.categoryName);
        }
        
        // Seller ID
        if (data.sellerId) {
          setSellerId(data.sellerId);
        } else {
          fetchSellerId();
        }
        
      } catch (error) {
        console.error('Error fetching product:', error);
        Alert.alert('Error', 'Failed to load product details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProduct();
  }, [id, router]);

  // Fetch seller ID from local storage if not available
  const fetchSellerId = async () => {
    const storedSellerId = await AsyncStorage.getItem('user');
    if (storedSellerId) {
      setSellerId(storedSellerId);
    } else {
      Alert.alert('Warning', 'Seller ID not found. Please log in.');
    }
  };

  // Handle category search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = categories.filter((category) =>
      category.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCategories(filtered);
  };

  // Handle category selection
  const handleSelectCategory = (category: { id: string; name: string } | null) => {
    setSelectedCategory(category);
    setSearchQuery(category ? category.name : '');
    setShowCategories(false);
  };

  // Handle featured image selection
  const handleSelectFeaturedImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0].uri;
      setFeaturedImage(selectedImage);
    }
  };

  // Handle image selection
  const handleSelectImages = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 5 images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const selectedImages = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...selectedImages].slice(0, 5));
    }
  };

  // Handle video selection
  const handleSelectVideos = async () => {
    if (videos.length >= 2) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 2 videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!result.canceled) {
      const selectedVideos = result.assets.map((asset) => asset.uri);
      setVideos((prev) => [...prev, ...selectedVideos].slice(0, 2));
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages(currentImages => currentImages.filter((_, i) => i !== index));
  };

  // Remove video
  const removeVideo = (index: number) => {
    setVideos(currentVideos => currentVideos.filter((_, i) => i !== index));
  };

  // Upload file to storage
  const uploadFileToStorage = async (uri: string, folder: string) => {
    // Check if the URI is already a Firebase URL
    if (uri.startsWith('https://firebasestorage.googleapis.com')) {
      return uri; // Return the existing URL
    }
    
    console.log(`Uploading file: ${uri} to folder: ${folder}`);
    const fileName = `${folder}/${Date.now()}`;
    const reference = storage().ref(fileName);
    await reference.putFile(uri);
    const downloadURL = await reference.getDownloadURL();
    console.log(`File uploaded. Download URL: ${downloadURL}`);
    return downloadURL;
  };

  // Save the edited product
  const handleSaveProduct = async () => {
    if (!id) {
      Alert.alert('Error', 'Product ID not found');
      return;
    }
    
    if (!featuredImage) {
      Alert.alert('Required', 'Please upload a featured image.');
      return;
    }

    setIsLoading(true);

    try {
      // Upload featured image if it's not already a Firebase URL
      let featuredImageUrl = featuredImage;
      if (!featuredImage.startsWith('https://firebasestorage.googleapis.com')) {
        featuredImageUrl = await uploadFileToStorage(featuredImage, 'featured-images');
      }

      // Upload new images (skip those that are already Firebase URLs)
      const imageUrls = await Promise.all(
        images.map((uri) => {
          if (uri.startsWith('https://firebasestorage.googleapis.com')) {
            return uri;
          }
          return uploadFileToStorage(uri, 'images');
        })
      );

      // Upload new videos (skip those that are already Firebase URLs)
      const videoUrls = await Promise.all(
        videos.map((uri) => {
          if (uri.startsWith('https://firebasestorage.googleapis.com')) {
            return uri;
          }
          return uploadFileToStorage(uri, 'videos');
        })
      );

      // Update the product in Firestore
      await firestore().collection('products').doc(String(id)).update({
        name: productName,
        description: description,
        measurements: measurements || '',
        categoryId: selectedCategory?.id || '',
        categoryName: selectedCategory?.name || '',
        featuredImage: featuredImageUrl,
        images: imageUrls,
        videos: videoUrls || [],
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
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert(
        'Success', 
        'Product updated successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => router.push('/(tabs)/explore') 
          }
        ]
      );
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !productName) {
    return (
      <Box className="flex-1 bg-gray-50 justify-center items-center">
        <Spinner size="large" color="blue" />
        <Text className="mt-4 text-gray-600">Loading product details...</Text>
      </Box>
    );
  }

  return (
    <GluestackUIProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          className="flex-1 bg-white"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 0,
            backgroundColor: 'white',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <VStack className="flex-1 bg-gray-50 ">
            {/* Hero Section */}
            <Box
              className=" rounded-b-lg flex items-left justify-end p-6"
              style={{
                backgroundColor: '#3B82F6', // Blue color that matches your brand
              }}
            >
              <Text className="text-3xl font-bold text-white text-left ">Edit Product</Text>
              <Text className="text-md text-white opacity-90 mt-1">
                {skuId ? `SKU: ${skuId}` : 'Update your product details'}
              </Text>
            </Box>

            {/* Form Section */}
            <VStack className="p-8 space-y-8">
              {/* Basic Information */}
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

              {/* Category */}
              <Box className="mb-7 space-y-8">
                <Text className="text-xl font-bold mb-4">Category</Text>
                <Input>
                  <InputSlot className="pl-3">
                    <InputField
                      placeholder="Search categories"
                      value={searchQuery}
                      onFocus={() => setShowCategories(true)}
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

              {/* Featured Image */}
              <Box className="mb-7 space-y-8">
                <Text className="text-xl font-bold mb-4">Featured Image</Text>
                <TouchableOpacity
                  className="border-dashed border-2 border-gray-300 rounded-md p-6 flex items-center justify-center"
                  onPress={handleSelectFeaturedImage}
                >
                  <Text className="text-gray-500">
                    {featuredImage ? "Change Featured Image" : "Upload Featured Image"}
                  </Text>
                </TouchableOpacity>
                {featuredImage && (
                  <Box className="relative">
                    <Image
                      source={{ uri: featuredImage }}
                      style={{ width: '100%', height: 200, borderRadius: 8, marginTop: 10 }}
                      resizeMode="cover"
                    />
                  </Box>
                )}
              </Box>

              {/* Media */}
              <Box className="mb-7 space-y-8">
                <Text className="text-xl font-bold mb-4">Additional Images</Text>
                <TouchableOpacity
                  className="border-dashed border-2 border-gray-300 rounded-md p-6 flex items-center justify-center"
                  onPress={handleSelectImages}
                >
                  <Text className="text-gray-500">Upload Images (Max: 5)</Text>
                </TouchableOpacity>
                
                {images.length > 0 && (
                  <HStack className="flex-wrap gap-4 mt-4">
                    {images.map((uri, index) => (
                      <Box key={index} className="relative">
                        <Image
                          source={{ uri }}
                          style={{ width: 80, height: 80, borderRadius: 8 }}
                        />
                        <TouchableOpacity
                          onPress={() => removeImage(index)}
                          style={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            backgroundColor: 'rgba(255, 0, 0, 0.7)',
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: 'white', fontSize: 12 }}>×</Text>
                        </TouchableOpacity>
                      </Box>
                    ))}
                  </HStack>
                )}
                
                <Text className="text-xl font-bold mb-4 mt-6">Videos</Text>
                <TouchableOpacity
                  className="border-dashed border-2 border-gray-300 rounded-md p-6 flex items-center justify-center"
                  onPress={handleSelectVideos}
                >
                  <Text className="text-gray-500">Upload Videos (Max: 2)</Text>
                </TouchableOpacity>
                
                {videos.length > 0 && (
                  <HStack className="flex-wrap gap-4 mt-4">
                    {videos.map((uri, index) => (
                      <Box key={index} className="relative">
                        <Box className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center">
                          <Text className="text-center text-xs">Video {index + 1}</Text>
                        </Box>
                        <TouchableOpacity
                          onPress={() => removeVideo(index)}
                          style={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            backgroundColor: 'rgba(255, 0, 0, 0.7)',
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: 'white', fontSize: 12 }}>×</Text>
                        </TouchableOpacity>
                      </Box>
                    ))}
                  </HStack>
                )}
              </Box>

              {/* Pricing & Availability */}
              <Box className="mb-7 space-y-8">
                <Text className="text-xl font-bold mb-4">Pricing & Availability</Text>
                <VStack className="space-y-4">
                  <Input className="mb-4">
                    <InputSlot className="pl-3">
                      <InputField
                        placeholder="Enter base price"
                        value={basePrice}
                        onChangeText={setBasePrice}
                        keyboardType="numeric"
                      />
                    </InputSlot>
                  </Input>
                  <Input className="mb-4">
                    <InputSlot className="pl-3">
                      <InputField
                        placeholder="Enter discount price (if any)"
                        value={discountPrice}
                        onChangeText={setDiscountPrice}
                        keyboardType="numeric"
                      />
                    </InputSlot>
                  </Input>
                  <Input className="mb-4">
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
                      keyboardType="numeric"
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
                
                <Text className="text-xl font-bold mb-4">Status</Text>
                <Select
                  selectedValue={status}
                  onValueChange={setStatus}
                  className="w-full"
                >
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

              {/* Update Product Button */}
              <Button
                onPress={handleSaveProduct}
                className="mt-6 bg-blue-600 py-4 rounded-xl h-15"
                disabled={isLoading}
              >
                {isLoading ? (
                  <HStack className="space-x-2 items-center">
                    <Spinner color="white" size="small" />
                    <ButtonText className="text-white">Updating...</ButtonText>
                  </HStack>
                ) : (
                  <ButtonText className="text-white font-bold">Update Product</ButtonText>
                )}
              </Button>
              
              {/* Cancel Button */}
              <Button
                onPress={() => router.push('/(tabs)/explore')}
                className="mt-3 bg-gray-200 py-3 rounded-xl  h-15"
                disabled={isLoading}
              >
                <ButtonText className="text-gray-700">Cancel</ButtonText>
              </Button>
            </VStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </GluestackUIProvider>
  );
};

export default EditProduct;