'use client';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { useCart } from '@/services/context/CartContext';
import { Product, getFeaturedProducts, getPopularProducts } from '@/services/productService';
import { useRouter } from 'expo-router';
import { ArrowRight, ChevronLeft, ChevronRight, Heart, MessageSquare, Search, ShoppingBag, ShoppingCart, Star, Tag, TrendingUp, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Platform, SafeAreaView, StatusBar, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom gradient component as alternative to LinearGradient
interface CustomGradientProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: any;
  className?: string;
  children?: React.ReactNode;
}

const CustomGradient = ({ colors, start, end, style, className, children }: CustomGradientProps) => {
  return (
    <View
      style={[
        {
          backgroundColor: colors[0],
          backgroundImage: `linear-gradient(to ${(end?.y ?? 0) > (end?.x ?? 0) ? 'bottom' : 'right'}, ${colors.join(', ')})`,
          position: 'relative',
          overflow: 'hidden',
        },
        style,
        // Convert className to style object if needed for native
        className ? { className } : {}
      ]}
    >
      {children}
    </View>
  );
};

const { width } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = width;

export default function BuyerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { addItem, isLoading: cartLoading } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const carouselRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [categories] = useState([
    { id: '1', name: 'Electronics', icon: <ShoppingBag size={18} color="#3B82F6" /> },
    { id: '2', name: 'Apparel', icon: <Tag size={18} color="#10B981" /> },
    { id: '3', name: 'Industrial', icon: <TrendingUp size={18} color="#F59E0B" /> },
    { id: '4', name: 'Home Goods', icon: <ShoppingBag size={18} color="#EF4444" /> },
    { id: '5', name: 'Food & Beverage', icon: <ShoppingBag size={18} color="#8B5CF6" /> },
  ]);

  // Fetch products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        // Get featured products first
        const featured = await getFeaturedProducts(15);
        console.log('Featured products loaded:', featured.length);
        setFeaturedProducts(featured || []);
        
        // Then get popular products separately
        const popular = await getPopularProducts(8);
        console.log('Popular products loaded:', popular.length);
        setPopularProducts(popular || []);
      } catch (error) {
        // Just log the error, don't throw
        console.error('Error loading products:', error);
      } finally {
        // Always set loading to false
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);
  
  // Auto-scroll carousel
  useEffect(() => {
    const carouselInterval = setInterval(() => {
      if (featuredProducts.length > 0) {
        const nextIndex = (activeCarouselIndex + 1) % Math.min(5, featuredProducts.length);
        carouselRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true
        });
        setActiveCarouselIndex(nextIndex);
      }
    }, 3500);

    return () => clearInterval(carouselInterval);
  }, [activeCarouselIndex, featuredProducts]);
  
  const navigateToProduct = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  // Handle carousel scroll
  const onCarouselScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onCarouselViewableItemsChanged = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveCarouselIndex(viewableItems[0].index || 0);
    }
  };

  const renderCarouselItem = ({ item, index }: { item: Product, index: number }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={() => navigateToProduct(item.id || '')}
      style={{ width: CAROUSEL_ITEM_WIDTH }}
    >
      <Box className="relative h-[220px]">
        <Image
          source={{ uri: item.featuredImage || 'https://via.placeholder.com/800x400?text=Product' }}
          className="w-full h-full"
          alt={item.name || 'Product'}
          resizeMode="cover"
        />
        <CustomGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
          className="absolute bottom-0 left-0 right-0 h-[100px]"
        >
          <Box className="absolute bottom-0 left-0 right-0 p-4">
            <Text className="text-white text-xl font-bold" numberOfLines={1}>
              {item.name}
            </Text>
            <HStack className="items-center mt-1">
              <Text className="text-white text-base font-bold mr-2">
                ₹{(item.discountPrice && item.discountPrice > 0) ? item.discountPrice : item.basePrice}
              </Text>
              {(item.discountPrice && item.discountPrice > 0) && (
                <Text className="text-gray-300 line-through">
                  ₹{item.basePrice}
                </Text>
              )}
            </HStack>
          </Box>
        </CustomGradient>
        
        {/* Navigation arrows */}
        {index === activeCarouselIndex && (
          <>
            {activeCarouselIndex > 0 && (
              <TouchableOpacity
                className="absolute top-1/2 left-2 w-10 h-10 bg-white/30 rounded-full items-center justify-center -translate-y-5"
                onPress={() => {
                  const newIndex = activeCarouselIndex - 1;
                  carouselRef.current?.scrollToIndex({
                    index: newIndex,
                    animated: true
                  });
                  setActiveCarouselIndex(newIndex);
                }}
              >
                <ChevronLeft size={24} color="white" />
              </TouchableOpacity>
            )}
            
            {activeCarouselIndex < Math.min(featuredProducts.length, 5) - 1 && (
              <TouchableOpacity
                className="absolute top-1/2 right-2 w-10 h-10 bg-white/30 rounded-full items-center justify-center -translate-y-5"
                onPress={() => {
                  const newIndex = activeCarouselIndex + 1;
                  carouselRef.current?.scrollToIndex({
                    index: newIndex,
                    animated: true
                  });
                  setActiveCarouselIndex(newIndex);
                }}
              >
                <ChevronRight size={24} color="white" />
              </TouchableOpacity>
            )}
          </>
        )}
        
        {/* Add favorite button */}
        <TouchableOpacity
          className="absolute top-3 right-3 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center"
          onPress={() => alert(`Added ${item.name} to favorites`)}
        >
          <Heart size={20} color="white" />
        </TouchableOpacity>
      </Box>
    </TouchableOpacity>
  );

  // Render product card using Gluestack Card component with Tailwind
  const renderProductCard = ({ item }: { item: Product }) => {
    const handleAddToCart = async () => {
      try {
        await addItem(item, 1);
        toast.show({
          render: () => (
            <Toast action="success" variant="solid">
              <VStack space="xs">
                <ToastTitle>Added to cart</ToastTitle>
                <ToastDescription>{item.name} was added to your cart</ToastDescription>
              </VStack>
            </Toast>
          )
        });
      } catch (error) {
        toast.show({
          render: () => (
            <Toast action="error" variant="solid">
              <VStack space="xs">
                <ToastTitle>Error</ToastTitle>
                <ToastDescription>Failed to add item to cart</ToastDescription>
              </VStack>
            </Toast>
          )
        });
      }
    };

    return (
      <TouchableOpacity 
        onPress={() => navigateToProduct(item.id || '')}
        className="w-[170px] mr-3"
      >
        <Card variant="elevated" size="md" className="overflow-hidden rounded-lg">
          <Box className="relative">
            <Image
              source={{ uri: item.featuredImage || 'https://via.placeholder.com/300x300?text=Product' }}
              className="w-full h-[130px]"
              alt={item.name || 'Product'}
              resizeMode="cover"
            />
            {item.discountPrice && item.discountPrice > 0 && (
              <View className="absolute top-2 left-2 bg-red-500 px-2 py-0.5 rounded">
                <Text className="text-xs text-white font-medium">
                  {Math.round((1 - item.discountPrice / item.basePrice) * 100)}% OFF
                </Text>
              </View>
            )}
          </Box>
          <Box className="p-3">
            <Text className="text-sm font-medium text-gray-800 mb-1" numberOfLines={1}>
              {item.name || 'Product Name'}
            </Text>
            <HStack className="flex-row items-center mb-1">
              <Text className="text-base font-bold text-blue-600 mr-1.5">
                ₹{(item.discountPrice && item.discountPrice > 0) ? item.discountPrice : item.basePrice}
              </Text>
              {(item.discountPrice && item.discountPrice > 0) && 
                <Text className="text-xs text-gray-500 line-through">₹{item.basePrice}</Text>
              }
            </HStack>
            <HStack className="flex-row justify-between items-center mb-2">
              <Text className="text-xs text-gray-500">
                Min. {item.stockQuantity && item.stockQuantity > 100 ? 10 : 5} units
              </Text>
              <HStack className="flex-row items-center">
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-xs ml-0.5 text-gray-500">
                  {(Math.random() * 1 + 4).toFixed(1)}
                </Text>
              </HStack>
            </HStack>
            <HStack className="flex-row justify-between items-center">
              <Button 
                size="sm" 
                variant="solid" 
                className="flex-1 bg-blue-500 rounded-md h-7"
                onPress={(e) => {
                  e.stopPropagation(); // Prevent triggering navigation
                  handleAddToCart();
                }}
                isDisabled={cartLoading}
              >
                <ButtonText className="text-xs text-white">
                  {cartLoading ? 'Adding...' : 'Add to Cart'}
                </ButtonText>
              </Button>
              <TouchableOpacity 
                className="w-7 h-7 rounded-md bg-blue-50 justify-center items-center ml-2"
                onPress={() => alert(`Chat about ${item.name || 'this product'}`)}
              >
                <MessageSquare size={16} color="#3B82F6" />
              </TouchableOpacity>
            </HStack>
          </Box>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderCategoryButton = ({ item }: { item: any }) => (
    <TouchableOpacity 
      className="w-20 mr-3 items-center"
      onPress={() => router.push('/(buyer)/shop')}
    >
      <View className="w-12 h-12 rounded-full bg-blue-50 justify-center items-center mb-2">
        {item.icon}
      </View>
      <Text className="text-xs text-gray-800 text-center">{item.name}</Text>
    </TouchableOpacity>
  );

  // Render dot indicators for carousel
  const renderCarouselIndicator = () => {
    return (
      <HStack className="justify-center mt-3 mb-2">
        {Array.from({ length: Math.min(5, featuredProducts.length) }).map((_, index) => (
          <View 
            key={index} 
            className={`h-1.5 rounded-full mx-1 ${index === activeCarouselIndex ? 'w-5 bg-blue-500' : 'w-1.5 bg-gray-300'}`}
          />
        ))}
      </HStack>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <Box className="flex-1 bg-gray-50" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <ScrollView 
          className="flex-1" 
          contentContainerClassName="pb-24"
          showsVerticalScrollIndicator={false}
        >
          {/* Search Bar */}
          <Box className="px-4 pt-2 pb-2">
            <Input variant="outline" size="md" className="bg-white shadow-sm">
              <InputSlot className="pl-3">
                <InputIcon>
                  <Search size={20} color="#6B7280" />
                </InputIcon>
              </InputSlot>
              <InputField
                placeholder="Search for products..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <InputSlot className="pr-3">
                  <InputIcon onPress={() => setSearchQuery('')}>
                    <X size={18} color="#6B7280" />
                  </InputIcon>
                </InputSlot>
              )}
            </Input>
          </Box>
          
          {/* Product Carousel */}
          <Box className="mt-2">
            {loading ? (
              <Box className="h-[220px] justify-center items-center">
                <Spinner size="large" color="#3B82F6" />
              </Box>
            ) : featuredProducts.length > 0 ? (
              <>
                <FlatList
                  ref={carouselRef}
                  data={featuredProducts.slice(0, 5)}
                  renderItem={renderCarouselItem}
                  keyExtractor={(item) => `carousel-${item.id || Math.random().toString()}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={onCarouselScroll}
                  onViewableItemsChanged={onCarouselViewableItemsChanged}
                  viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                />
                {renderCarouselIndicator()}
              </>
            ) : (
              <Box className="h-[220px] justify-center items-center">
                <Text className="text-gray-500">No products found</Text>
              </Box>
            )}
          </Box>

          {/* Categories */}
          <Box className="mt-4">
            <HStack className="px-4 mb-3 justify-between items-center">
              <Heading size="sm" className="text-lg font-semibold text-gray-800">Categories</Heading>
              <TouchableOpacity onPress={() => router.push('/(buyer)/shop')}>
                <HStack className="items-center">
                  <Text className="text-sm text-blue-500 mr-1">See All</Text>
                  <ArrowRight size={16} color="#3B82F6" />
                </HStack>
              </TouchableOpacity>
            </HStack>
            
            <FlatList
              data={categories}
              renderItem={renderCategoryButton}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="pl-4 pr-2"
            />
          </Box>

          {/* Featured Products */}
          <Box className="mt-6">
            <HStack className="px-4 mb-3 justify-between items-center">
              <Heading size="sm" className="text-lg font-semibold text-gray-800">Featured Products</Heading>
              <TouchableOpacity onPress={() => router.push('/(buyer)/shop')}>
                <HStack className="items-center">
                  <Text className="text-sm text-blue-500 mr-1">See All</Text>
                  <ArrowRight size={16} color="#3B82F6" />
                </HStack>
              </TouchableOpacity>
            </HStack>
            
            {loading ? (
              <Box className="h-[200px] justify-center items-center">
                <Spinner size="large" color="#3B82F6" />
              </Box>
            ) : featuredProducts.length > 0 ? (
              <FlatList
                data={featuredProducts.slice(5, 13)}
                renderItem={renderProductCard}
                keyExtractor={(item) => `featured-${item.id || Math.random().toString()}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="pl-4 pr-2"
              />
            ) : (
              <Box className="h-[200px] justify-center items-center">
                <Text className="text-gray-500">No featured products found</Text>
              </Box>
            )}
          </Box>

          {/* Special Offer Banner */}
          <TouchableOpacity 
            className="mt-8 mx-4"
            onPress={() => router.push('/(buyer)/shop?promo=summer')}
          >
            <CustomGradient
              colors={['#3B82F6', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.8 }}
              className="rounded-2xl overflow-hidden"
            >
              <Box className="px-6 py-6 relative">
                <HStack className="justify-between items-center">
                  <VStack className="flex-2 pr-6">
                    <Box className="bg-white/20 self-start px-3 py-1 rounded-full mb-2">
                      <Text className="text-white/90 text-xs font-semibold">LIMITED TIME</Text>
                    </Box>
                    <Text className="text-white text-2xl font-bold mb-2">Summer Sale!</Text>
                    <Text className="text-white/90 mb-4 text-base" numberOfLines={2}>
                      Get up to 40% off on selected items this season
                    </Text>
                    <TouchableOpacity className="bg-white self-start px-5 py-2.5 rounded-lg shadow-sm">
                      <Text className="font-semibold text-blue-600">Shop Now</Text>
                    </TouchableOpacity>
                  </VStack>
                  <Box className="absolute right-4 top-1/2 -translate-y-1/2">
                    <View className="w-28 h-28 bg-white/25 backdrop-blur-md rounded-full justify-center items-center shadow-lg">
                      <Text className="text-white font-bold text-4xl">40%</Text>
                      <Text className="text-white font-bold text-xl">OFF</Text>
                    </View>
                  </Box>
                </HStack>
              </Box>
            </CustomGradient>
          </TouchableOpacity>

          {/* Popular Products */}
          <Box className="mt-6">
            <HStack className="px-4 mb-3 justify-between items-center">
              <Heading size="sm" className="text-lg font-semibold text-gray-800">Popular Products</Heading>
              <TouchableOpacity onPress={() => router.push('/(buyer)/shop')}>
                <HStack className="items-center">
                  <Text className="text-sm text-blue-500 mr-1">See All</Text>
                  <ArrowRight size={16} color="#3B82F6" />
                </HStack>
              </TouchableOpacity>
            </HStack>
            
            {loading ? (
              <Box className="h-[200px] justify-center items-center">
                <Spinner size="large" color="#3B82F6" />
              </Box>
            ) : popularProducts.length > 0 ? (
              <View className="flex-row flex-wrap justify-between px-4">
                {popularProducts.slice(0, 4).map((product) => (
                  <TouchableOpacity 
                    key={`popular-${product.id || Math.random().toString()}`}
                    className="w-[48%] mb-4"
                    onPress={() => router.push(`/product/${product.id || ''}`)}
                  >
                    <Card variant="elevated" size="sm" className="overflow-hidden rounded-lg">
                      <Box className="relative">
                        <Image
                          source={{ uri: product.featuredImage || 'https://via.placeholder.com/300x300?text=Product' }}
                          className="w-full h-[120px]"
                          alt={product.name || 'Product'}
                          resizeMode="cover"
                        />
                        {product.discountPrice && product.discountPrice > 0 && (
                          <View className="absolute top-2 left-2 bg-red-500 px-2 py-0.5 rounded">
                            <Text className="text-xs text-white font-medium">
                              {Math.round((1 - product.discountPrice / product.basePrice) * 100)}% OFF
                            </Text>
                          </View>
                        )}
                      </Box>
                      <Box className="p-2.5">
                        <Text className="text-sm font-medium text-gray-800 mb-1" numberOfLines={1}>
                          {product.name || 'Product Name'}
                        </Text>
                        <HStack className="flex-row items-center mb-1">
                          <Text className="text-[15px] font-bold text-blue-600 mr-1.5">
                            ₹{(product.discountPrice && product.discountPrice > 0) ? product.discountPrice : product.basePrice}
                          </Text>
                          {(product.discountPrice && product.discountPrice > 0) && (
                            <Text className="text-xs text-gray-500 line-through">₹{product.basePrice}</Text>
                          )}
                        </HStack>
                        <HStack className="flex-row justify-between items-center mb-2">
                          <Text className="text-xs text-gray-500">
                            Min. {product.stockQuantity && product.stockQuantity > 100 ? 10 : 5} units
                          </Text>
                          <HStack className="flex-row items-center">
                            <Star size={12} color="#F59E0B" fill="#F59E0B" />
                            <Text className="text-xs ml-0.5 text-gray-500">
                              {(Math.random() * 1 + 4).toFixed(1)}
                            </Text>
                          </HStack>
                        </HStack>
                      </Box>
                      <TouchableOpacity 
                        className="flex-row items-center justify-center py-2 bg-blue-500"
                        onPress={async (e) => {
                          e.stopPropagation();
                          try {
                            await addItem(product, 1);
                            toast.show({
                              render: () => (
                                <Toast action="success" variant="solid">
                                  <VStack space="xs">
                                    <ToastTitle>Added to cart</ToastTitle>
                                    <ToastDescription>{product.name} was added to your cart</ToastDescription>
                                  </VStack>
                                </Toast>
                              )
                            });
                          } catch (error) {
                            toast.show({
                              render: () => (
                                <Toast action="error" variant="solid">
                                  <VStack space="xs">
                                    <ToastTitle>Error</ToastTitle>
                                    <ToastDescription>Failed to add item to cart</ToastDescription>
                                  </VStack>
                                </Toast>
                              )
                            });
                          }
                        }}
                        disabled={cartLoading}
                      >
                        <ShoppingCart size={14} color="white" />
                        <Text className="text-xs ml-1 text-white font-medium">Add to Cart</Text>
                      </TouchableOpacity>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Box className="h-[200px] justify-center items-center">
                <Text className="text-gray-500">No popular products found</Text>
              </Box>
            )}
          </Box>

          {/* Daily Deals Banner */}
          <TouchableOpacity 
            className="mt-2 mx-4"
            onPress={() => router.push('/(buyer)/shop?deals=daily')}
          >
            <Box className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <HStack className="justify-between items-center">
                <VStack className="flex-2">
                  <Text className="text-amber-800 font-medium mb-1">TODAY'S DEAL</Text>
                  <Text className="text-gray-800 text-lg font-bold mb-1">Flash Sale on Electronics</Text>
                  <Text className="text-gray-600 text-sm mb-2">Ends in 6 hours</Text>
                  <Button size="sm" className="self-start bg-amber-500 border-0">
                    <ButtonText className="text-white">View Deals</ButtonText>
                  </Button>
                </VStack>
                <Box className="flex-1 items-center">
                  <View className="w-20 h-20 bg-amber-100 rounded-full justify-center items-center">
                    <Text className="text-amber-800 font-bold text-lg">Up to</Text>
                    <Text className="text-amber-800 font-bold text-2xl">50%</Text>
                  </View>
                </Box>
              </HStack>
            </Box>
          </TouchableOpacity>
        </ScrollView>
      </Box>
    </SafeAreaView>
  );
}