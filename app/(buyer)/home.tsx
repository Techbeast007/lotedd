'use client';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card'; // Import Card component
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Product, getFeaturedProducts, getPopularProducts } from '@/services/productService';
import { useRouter } from 'expo-router';
import { ArrowRight, Badge, MessageSquare, Search, ShoppingBag, Star, TrendingUp, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function BuyerHomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories] = useState([
    { id: '1', name: 'Electronics', icon: <ShoppingBag size={18} color="#3B82F6" /> },
    { id: '2', name: 'Apparel', icon: <Badge size={18} color="#10B981" /> },
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
        const featured = await getFeaturedProducts(8);
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
  
  const navigateToProduct = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  // Render product card using Gluestack Card component with Tailwind
  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      onPress={() => navigateToProduct(item.id || '')}
      className="w-[170px] mr-3"
    >
      <Card variant="elevated" size="md" className="overflow-hidden rounded-lg">
        <Image
          source={{ uri: item.featuredImage || 'https://via.placeholder.com/300x300?text=Product' }}
          className="w-full h-[130px]"
          alt={item.name || 'Product'}
          resizeMode="cover"
        />
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
          <Text className="text-xs text-gray-500 mb-2">
            Min. Order: {item.stockQuantity && item.stockQuantity > 100 ? 10 : 5} units
          </Text>
          <HStack className="flex-row justify-between items-center">
            <Button size="sm" variant="solid" className="flex-1 bg-blue-500 rounded-md h-7">
              <ButtonText className="text-xs text-white">Add to Cart</ButtonText>
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

  return (
    <Box style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Search Bar */}
        <Box style={styles.searchContainer}>
          <Input variant="outline" size="md" style={styles.searchInput}>
            <InputSlot style={{paddingLeft: 12}}>
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
              <InputSlot style={{paddingRight: 12}}>
                <InputIcon onPress={() => setSearchQuery('')}>
                  <X size={18} color="#6B7280" />
                </InputIcon>
              </InputSlot>
            )}
          </Input>
        </Box>

        {/* Featured Products */}
        <Box style={styles.sectionContainer}>
          <HStack style={styles.sectionHeader}>
            <Heading size="sm" style={styles.sectionTitle}>Featured Products</Heading>
            <TouchableOpacity onPress={() => router.push('/(buyer)/shop')}>
              <HStack style={styles.seeAllContainer}>
                <Text style={styles.seeAllText}>See All</Text>
                <ArrowRight size={16} color="#3B82F6" />
              </HStack>
            </TouchableOpacity>
          </HStack>
          
          {loading ? (
            <Box style={styles.loadingContainer}>
              <Spinner size="large" color="#3B82F6" />
            </Box>
          ) : featuredProducts.length > 0 ? (
            <FlatList
              data={featuredProducts}
              renderItem={renderProductCard}
              keyExtractor={(item) => item.id || `featured-${Math.random().toString()}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productList}
            />
          ) : (
            <Box style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No featured products found</Text>
            </Box>
          )}
        </Box>

        {/* Categories */}
        <Box style={styles.sectionContainer}>
          <HStack style={styles.sectionHeader}>
            <Heading size="sm" style={styles.sectionTitle}>Categories</Heading>
            <TouchableOpacity onPress={() => router.push('/(buyer)/shop')}>
              <HStack style={styles.seeAllContainer}>
                <Text style={styles.seeAllText}>See All</Text>
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
            contentContainerStyle={styles.categoryList}
          />
        </Box>

        {/* Bulk Deal Banner */}
        <TouchableOpacity 
          style={styles.bannerContainer}
          onPress={() => router.push('/(buyer)/shop')}
        >
          <Box style={styles.banner}>
            <HStack style={{ alignItems: 'center' }}>
              <Box style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>Bulk Deals</Text>
                <Text style={styles.bannerSubtitle}>
                  Save up to 30% on bulk orders
                </Text>
                <Button size="sm" style={styles.bannerButton}>
                  <ButtonText style={{ fontSize: 12 }}>Shop Now</ButtonText>
                </Button>
              </Box>
              <Box style={styles.bannerImageContainer}>
                {/* Banner image placeholder */}
                <View style={styles.bannerImage} />
              </Box>
            </HStack>
          </Box>
        </TouchableOpacity>

        {/* Popular Products */}
        <Box style={styles.sectionContainer}>
          <HStack style={styles.sectionHeader}>
            <Heading size="sm" style={styles.sectionTitle}>Popular Products</Heading>
            <TouchableOpacity onPress={() => router.push('/(buyer)/shop')}>
              <HStack style={styles.seeAllContainer}>
                <Text style={styles.seeAllText}>See All</Text>
                <ArrowRight size={16} color="#3B82F6" />
              </HStack>
            </TouchableOpacity>
          </HStack>
          
          {loading ? (
            <Box style={styles.loadingContainer}>
              <Spinner size="large" color="#3B82F6" />
            </Box>
          ) : popularProducts.length > 0 ? (
            <View className="flex-row flex-wrap justify-between px-4">
              {popularProducts.slice(0, 4).map((product) => (
                <TouchableOpacity 
                  key={product.id || `popular-${Math.random().toString()}`}
                  className="w-[48%] mb-4"
                  onPress={() => router.push(`/product/${product.id || ''}`)}
                >
                  <Card variant="elevated" size="sm" className="overflow-hidden rounded-lg">
                    <Image
                      source={{ uri: product.featuredImage || 'https://via.placeholder.com/300x300?text=Product' }}
                      className="w-full h-[120px]"
                      alt={product.name || 'Product'}
                      resizeMode="cover"
                    />
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
                    <Button size="sm" className="rounded-none bg-blue-500 rounded-bl-lg rounded-br-lg">
                      <ButtonText className="text-xs text-white">Add to Cart</ButtonText>
                    </Button>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Box style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No popular products found</Text>
            </Box>
          )}
        </Box>
      </ScrollView>
    </Box>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
  },
  sectionContainer: {
    marginTop: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    marginRight: 4,
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  productList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  categoryList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  categoryButton: {
    width: 80,
    marginRight: 12,
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#1F2937',
    textAlign: 'center',
  },
  bannerContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  banner: {
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    padding: 16,
  },
  bannerTextContainer: {
    flex: 2,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  bannerButton: {
    width: 100,
    backgroundColor: '#3B82F6',
  },
  bannerImageContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  bannerImage: {
    width: 80,
    height: 80,
    backgroundColor: '#BFDBFE',
    borderRadius: 8,
  },
});