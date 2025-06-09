import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, getFirestore, limit, query, where } from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { CheckCircle2, Circle, EditIcon, Filter } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, ScrollView, TouchableOpacity, View } from 'react-native';

const Explore = () => {
  interface Product {
    id: string;
    skuId: string;
    name: string;
    categoryName: string;
    description: string;
    measurements: string;
    images?: string[];
    status?: string;
    basePrice?: number;
    discountPrice?: number;
    stockQuantity?: number;
    featuredImage?: string;
    shortDescription?: string;
  }

  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [availableStatus, setAvailableStatus] = useState<string[]>(['Active', 'Inactive', 'Pending']);
  const [priceRange, setPriceRange] = useState<number>(10000);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts(20);
  }, []);

  const fetchProducts = async (limitCount: number = 20) => {
    try {
      setIsLoading(true);
      const firestore = getFirestore();
      
      // Get user data from storage and extract the UID
      const userDataString = await AsyncStorage.getItem('user');
      if (!userDataString) {
        console.error('User data not found.');
        setIsLoading(false);
        return;
      }
      
      // Parse the user data and get the sellerId (uid)
      const userData = JSON.parse(userDataString);
      const sellerId = userData.uid; // Extract just the UID
      
      console.log('Fetching products for seller ID:', sellerId);
      
      if (!sellerId) {
        console.error('Seller ID not found in user data.');
        setIsLoading(false);
        return;
      }
      
      // First try with the simple sellerId field
      const productsRef = collection(firestore, 'products');
      const q = query(
        productsRef,
        where('sellerId', '==', sellerId),
        limit(limitCount)
      );
      
      console.log('Executing Firestore query...');
      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} products with direct sellerId match`);
      
      let fetchedProducts = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          skuId: data.skuId || '',
          name: data.name || '',
          categoryName: data.categoryName || '',
          description: data.description || '',
          measurements: data.measurements || '',
          images: data.images || [],
          basePrice: data.basePrice || 0,
          brand: data.brand || '',
          categoryId: data.categoryId || '',
          color: data.color || '',
          createdAt: data.createdAt || null,
          discountPrice: data.discountPrice || 0,
          featuredImage: data.featuredImage || '',
          shortDescription: data.shortDescription || '',
          size: data.size || '',
          status: data.status || '',
          stockQuantity: data.stockQuantity || 0,
          videos: data.videos || [],
          weight: data.weight || 0,
        };
      });
      
      // If no products found, try checking for products that might have stored
      // the seller ID in a different way
      if (fetchedProducts.length === 0) {
        console.log('No products found with direct sellerId match, trying alternatives...');
        
        // Try to get all products and filter manually
        const allProductsQuery = query(
          productsRef,
          limit(100) // Get more products to filter through
        );
        
        const allProductsSnapshot = await getDocs(allProductsQuery);
        console.log(`Found ${allProductsSnapshot.size} total products to filter`);
        
        // Filter products that might have the seller ID in a different format or field
        const filteredProducts = allProductsSnapshot.docs
          .filter(doc => {
            const data = doc.data();
            // Check if any field contains the seller ID
            return (
              (data.sellerId && data.sellerId.includes(sellerId)) || 
              (data.userId && data.userId === sellerId) ||
              (data.ownerId && data.ownerId === sellerId) ||
              (data.sellerUid && data.sellerUid === sellerId) ||
              (data.createdBy && data.createdBy === sellerId)
            );
          })
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              skuId: data.skuId || '',
              name: data.name || '',
              categoryName: data.categoryName || '',
              description: data.description || '',
              measurements: data.measurements || '',
              images: data.images || [],
              basePrice: data.basePrice || 0,
              brand: data.brand || '',
              categoryId: data.categoryId || '',
              color: data.color || '',
              createdAt: data.createdAt || null,
              discountPrice: data.discountPrice || 0,
              featuredImage: data.featuredImage || '',
              shortDescription: data.shortDescription || '',
              size: data.size || '',
              status: data.status || '',
              stockQuantity: data.stockQuantity || 0,
              videos: data.videos || [],
              weight: data.weight || 0,
            };
          });
          
        console.log(`Found ${filteredProducts.length} products after manual filtering`);
        
        // Combine the filtered products with any that matched directly
        fetchedProducts = [...fetchedProducts, ...filteredProducts];
      }
      
      console.log(`Total products to display: ${fetchedProducts.length}`);
      setProducts(fetchedProducts);
      setFilteredProducts(fetchedProducts);
    
      // Extract unique categories
      const uniqueCategories: string[] = [
        ...new Set(fetchedProducts.map((product) => product.categoryName).filter(Boolean)),
      ];
      setAvailableCategories(uniqueCategories);
    
      // Extract unique statuses
      const uniqueStatuses: string[] = [
        ...new Set(fetchedProducts.map((product) => product.status || 'Unknown').filter(Boolean)),
      ];
      setAvailableStatus(uniqueStatuses.length > 0 ? uniqueStatuses : ['Active', 'Inactive', 'Pending']);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleCategory = (category: string) => {
    setCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleStatus = (statusOption: string) => {
    setStatus(prev =>
      prev.includes(statusOption)
        ? prev.filter(s => s !== statusOption)
        : [...prev, statusOption]
    );
  };
  
  const applyFilters = () => {
    let filtered = [...products];
  
    // Filter by categories
    if (categories.length > 0) {
      filtered = filtered.filter((product) => categories.includes(product.categoryName));
    }
    
    // Filter by status
    if (status.length > 0) {
      filtered = filtered.filter((product) => status.includes(product.status || 'Unknown'));
    }
  
    // Filter by price range
    filtered = filtered.filter((product) => {
      // Use basePrice if available, otherwise try to parse from measurements
      const price = product.basePrice || parseInt(product.measurements?.replace(/\D/g, '') || '0', 10) || 0;
      return price <= priceRange;
    });
  
    setFilteredProducts(filtered);
    setShowFilters(false);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const resetFilters = () => {
    setCategories([]);
    setStatus([]);
    setPriceRange(10000);
    setFilteredProducts(products);
  };

  const paginateProducts = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  const handleNextPage = () => {
    if (currentPage * itemsPerPage < filteredProducts.length) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const getStatusColor = (productStatus: string | undefined) => {
    switch (productStatus) {
      case 'Active':
      case 'live':
        return 'text-green-600';
      case 'Inactive':
      case 'draft':
        return 'text-gray-600';
      case 'Pending':
      case 'paused':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <VStack className="flex-1">
        {/* Hero Section - Updated with solid blue background */}
        <Box className="h-48 bg-blue-600 rounded-b-3xl flex flex-col justify-end items-start p-8 shadow-lg">
          <Text className="text-3xl font-bold text-white mb-2">Explore Products</Text>
          <Text className="text-md text-white opacity-90 mb-2">
            Discover and manage your product catalog effortlessly.
          </Text>
        </Box>

        {/* Filter Section - Improved UI */}
        <HStack className="justify-between items-center p-4 bg-white mx-4 mt-4 rounded-xl shadow">
          <Text className="text-gray-700 font-medium">
            {filteredProducts.length} Products
          </Text>
          <Button
            variant="solid"
            size="sm"
            onPress={() => setShowFilters(true)}
            className="bg-blue-600 rounded-lg px-4 flex-row items-center"
          >
            <Filter size={16} color="white" className="mr-2" />
            <ButtonText className="text-white">Filters</ButtonText>
          </Button>
        </HStack>

        {/* Modal-based Filter UI instead of Drawer */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showFilters}
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}>
            <View style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: '85%',
            }}>
              {/* Filter Header */}
              <HStack className="justify-between items-center mb-4">
                <Heading size="md">Filter Products</Heading>
                <TouchableOpacity onPress={resetFilters}>
                  <Text className="text-blue-600 font-semibold">Reset All</Text>
                </TouchableOpacity>
              </HStack>

              <ScrollView style={{ maxHeight: '70%' }} showsVerticalScrollIndicator={false}>
                {/* Categories Section */}
                <VStack className="mb-8">
                  <Text className="text-xl font-bold text-gray-800 mb-4">Categories</Text>
                  <VStack className="space-y-3">
                    {availableCategories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        onPress={() => toggleCategory(category)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 8,
                        }}
                      >
                        {categories.includes(category) ? (
                          <CheckCircle2 size={20} color="#2563EB" />
                        ) : (
                          <Circle size={20} color="#6B7280" />
                        )}
                        <Text className="text-gray-700 text-base ml-3">{category}</Text>
                      </TouchableOpacity>
                    ))}
                    {availableCategories.length === 0 && (
                      <Text className="text-gray-500 italic">No categories available</Text>
                    )}
                  </VStack>
                </VStack>

                {/* Divider */}
                <View className="w-full h-[1px] bg-gray-200 my-3" />

                {/* Status Section */}
                <VStack className="mb-8">
                  <Text className="text-xl font-bold text-gray-800 mb-4">Product Status</Text>
                  <VStack className="space-y-3">
                    {availableStatus.map((statusOption) => (
                      <TouchableOpacity
                        key={statusOption}
                        onPress={() => toggleStatus(statusOption)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 8,
                        }}
                      >
                        {status.includes(statusOption) ? (
                          <CheckCircle2 size={20} color="#2563EB" />
                        ) : (
                          <Circle size={20} color="#6B7280" />
                        )}
                        <Text className="text-gray-700 text-base ml-3">{statusOption}</Text>
                      </TouchableOpacity>
                    ))}
                  </VStack>
                </VStack>

                {/* Divider */}
                <View className="w-full h-[1px] bg-gray-200 my-3" />

                {/* Price Range (Simplified) */}
                <VStack className="mb-8">
                  <HStack className="justify-between items-center mb-4">
                    <Text className="text-xl font-bold text-gray-800">Price Range</Text>
                    <Text className="text-blue-600 font-semibold">₹{priceRange}</Text>
                  </HStack>
                  
                  <VStack className="space-y-3">
                    {[1000, 2500, 5000, 7500, 10000].map(price => (
                      <TouchableOpacity
                        key={price}
                        onPress={() => setPriceRange(price)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 8,
                        }}
                      >
                        {priceRange === price ? (
                          <CheckCircle2 size={20} color="#2563EB" />
                        ) : (
                          <Circle size={20} color="#6B7280" />
                        )}
                        <Text className="text-gray-700 text-base ml-3">Up to ₹{price.toLocaleString()}</Text>
                      </TouchableOpacity>
                    ))}
                  </VStack>
                </VStack>
              </ScrollView>

              {/* Apply Button */}
              <View className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onPress={applyFilters}
                  className="bg-blue-600 w-full py-4 rounded-xl h-15"
                >
                  <ButtonText className="font-bold">Apply Filters</ButtonText>
                </Button>
                
                <TouchableOpacity 
                  onPress={() => setShowFilters(false)}
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text className="text-gray-500 font-medium">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Product Grid */}
        <VStack className="p-4">
          {isLoading ? (
            <Box className="h-60 flex items-center justify-center">
              <Spinner size="large" color="blue" />
            </Box>
          ) : filteredProducts.length === 0 ? (
            <Box className="h-60 flex items-center justify-center bg-white rounded-xl p-6 my-4">
              <VStack className="items-center">
                <Text className="text-xl font-semibold text-gray-700 mb-2">No Products Found</Text>
                <Text className="text-gray-500 text-center">Try adjusting your filters or add new products to your inventory.</Text>
                <Button 
                  className="mt-6 bg-blue-600 py-2 px-4 rounded-xl"
                  onPress={() => router.push('/productadd')}
                >
                  <ButtonText>Add New Product</ButtonText>
                </Button>
              </VStack>
            </Box>
          ) : (
            <VStack className="space-y-4">
              <Box className="flex-row flex-wrap justify-between">
                {paginateProducts().map((product) => (
                  <Box
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden"
                    style={{ width: screenWidth > 500 ? '48%' : '100%' }}
                  >
                    <Box className="relative">
                      <Image
                        source={{ uri: product.featuredImage || 'https://via.placeholder.com/300x150?text=No+Image' }}
                        className="w-full h-40 rounded-t-xl"
                        alt="Product Image"
                        resizeMode="cover"
                      />
                      <Box className={`absolute top-2 right-2 px-2 py-1 rounded-full ${
                        product.status === 'Active' || product.status === 'live' 
                          ? 'bg-green-100' 
                          : product.status === 'Pending' || product.status === 'paused'
                          ? 'bg-amber-100'
                          : 'bg-gray-100'
                      }`}>
                        <Text className={`text-xs font-medium ${getStatusColor(product.status)}`}>
                          {product.status || 'Unknown'}
                        </Text>
                      </Box>
                    </Box>
                    <VStack className="p-4">
                      <Text className="text-lg font-bold text-gray-800 mb-1" numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text className="text-sm text-gray-500 mb-2" numberOfLines={2}>
                        {product.shortDescription || product.description?.substring(0, 60) || 'No description available'}
                      </Text>
                      <HStack className="justify-between items-center mt-2">
                        <Text className="font-semibold text-gray-700">
                          {product.basePrice ? `₹${product.basePrice.toLocaleString()}` : ''}
                        </Text>
                        <Button
                          size="sm"
                          variant="solid"
                          onPress={() => {
                            console.log('Navigating to edit product with ID:', product.id);
                            // The pathname should match exactly how the folder is structured in the app directory
                            router.navigate({
                              pathname: "/editProduct",
                              params: { id: product.id }
                            });
                          }}
                          className="bg-blue-600 rounded-lg"
                        >
                          <HStack className="items-center space-x-1">
                            <EditIcon size={16} color="white" />
                            <ButtonText className="text-white">Edit</ButtonText>
                          </HStack>
                        </Button>
                      </HStack>
                    </VStack>
                  </Box>
                ))}
              </Box>
              
              {/* Pagination Controls */}
              {filteredProducts.length > itemsPerPage && (
                <HStack className="justify-between items-center py-4 px-2">
                  <Button
                    onPress={handlePreviousPage}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg ${currentPage === 1 ? 'bg-gray-200' : 'bg-gray-700'}`}
                  >
                    <ButtonText className={currentPage === 1 ? 'text-gray-500' : 'text-white'}>Previous</ButtonText>
                  </Button>
                  <Text className="text-gray-700">
                    Page {currentPage} of {Math.ceil(filteredProducts.length / itemsPerPage)}
                  </Text>
                  <Button
                    onPress={handleNextPage}
                    disabled={currentPage * itemsPerPage >= filteredProducts.length}
                    className={`px-4 py-2 rounded-lg ${currentPage * itemsPerPage >= filteredProducts.length ? 'bg-gray-200' : 'bg-blue-600'}`}
                  >
                    <ButtonText className={currentPage * itemsPerPage >= filteredProducts.length ? 'text-gray-500' : 'text-white'}>Next</ButtonText>
                  </Button>
                </HStack>
              )}
            </VStack>
          )}
        </VStack>
      </VStack>
    </ScrollView>
  );
};

export default Explore;


