'use client';

import { categories } from '@/assets/categories';
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
// Removed unused Input components
import { Text } from '@/components/ui/text';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { useCart } from '@/services/context/CartContext';
import { Product, getProducts } from '@/services/productService';
import { addToWishlist, getWishlistStatus, removeFromWishlist } from '@/services/wishlistService';
import { useRouter } from 'expo-router';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Filter,
  Grid,
  Heart,
  List,
  Package,
  Search,
  Sparkles,
  Star,
  X
} from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - 24; // 2 columns with spacing
const LIST_CARD_WIDTH = width - 32; // Full width with padding

// Sort options with proper icons
const SORT_OPTIONS = [
  { id: 'popular', label: 'Most Popular', icon: Sparkles },
  { id: 'price_asc', label: 'Price: Low to High', icon: ArrowUpDown },
  { id: 'price_desc', label: 'Price: High to Low', icon: ArrowUpDown },
  { id: 'newest', label: 'Newest First', icon: Package },
  { id: 'rating', label: 'Highest Rated', icon: Star },
];

// Product Card Component - Using Card component style
const ProductCardComponent = ({
  product,
  viewMode = 'grid',
  onPress,
  onAddToCart,
  onToggleFavorite,
  isAddingToCart,
  isFavorite = false,
}) => {
  const isGrid = viewMode === 'grid';
  const discounted = product.discountPrice && product.discountPrice < product.basePrice;
  const discount = discounted ? 
    Math.round(((product.basePrice - product.discountPrice) / product.basePrice) * 100) : 0;
    
  // Animation for heart button
  const [heartScale] = useState(new Animated.Value(1));
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Determine the best image to use with better fallback
  const imageUrl = useMemo(() => {
    if (product.featuredImage) return product.featuredImage;
    if (product.images && product.images.length > 0) return product.images[0];
    return 'https://via.placeholder.com/300?text=Product';
  }, [product.featuredImage, product.images]);
  
  const handleFavoritePress = useCallback(() => {
    // Heart animation
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    onToggleFavorite && onToggleFavorite(product);
  }, [heartScale, product, onToggleFavorite]);
  
  // Memoize handlers for better performance
  const handleAddToCart = useCallback(() => {
    onAddToCart && onAddToCart(product);
  }, [product, onAddToCart]);
  
  const handleCardPress = useCallback(() => {
    onPress && onPress(product.id);
  }, [product.id, onPress]);
  
  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={handleCardPress}
      style={isGrid ? styles.gridCardContainer : styles.listCardContainer}
    >
      <Card className={`p-3 rounded-lg ${isGrid ? 'max-w-full' : 'max-w-full'}`}>
        {/* Image Container with Discount Badge and Favorite Button */}
        <Box className="relative">
          <Image
            source={{ uri: imageUrl }}
            className={`h-${isGrid ? '[150px]' : '[120px]'} w-full rounded-md aspect-[4/3]`}
            alt={product.name || "Product image"}
            contentFit="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
          
          {imageLoading && (
            <View className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-background-50">
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          )}
          
          {imageError && (
            <View className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-background-100">
              <Text className="text-2xl font-bold text-background-400">
                {(product.name || "Product").charAt(0)}
              </Text>
            </View>
          )}
          
          {discount > 0 && (
            <Box className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded-md">
              <Text className="text-xs font-bold text-white">{discount}% OFF</Text>
            </Box>
          )}
          
          <Animated.View 
            style={[
              { transform: [{ scale: heartScale }] },
              { position: 'absolute', top: 8, right: 8 }
            ]}
          >
            <TouchableOpacity
              onPress={handleFavoritePress}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              className="w-8 h-8 rounded-full bg-black bg-opacity-30 flex items-center justify-center"
            >
              <Heart 
                size={18} 
                color={isFavorite ? "#FF4D4F" : "#FFFFFF"} 
                fill={isFavorite ? "#FF4D4F" : "none"} 
                strokeWidth={2}
              />
            </TouchableOpacity>
          </Animated.View>
        </Box>
        
        {/* Content */}
        <VStack className="mt-3">
          {/* Brand */}
          {product.brand && (
            <Text
              className="text-xs text-typography-500"
              numberOfLines={1}
            >
              {product.brand}
            </Text>
          )}
          
          {/* Product Name */}
          <Heading size="sm" className="mb-1 mt-1" numberOfLines={2}>
            {product.name}
          </Heading>
          
          {/* Rating */}
          {product.rating && (
            <HStack space="xs" alignItems="center" className="mb-1">
              <Star size={14} color="#FFAB00" fill="#FFAB00" />
              <Text className="text-xs text-typography-600">
                {product.rating.toFixed(1)}
              </Text>
              {product.reviewCount && (
                <Text className="text-xs text-typography-400">
                  ({product.reviewCount})
                </Text>
              )}
            </HStack>
          )}
          
          {/* Price */}
          <HStack space="xs" alignItems="center" className="mb-4">
            <Text className="text-base font-medium text-typography-900">
              ₹{discounted ? product.discountPrice : product.basePrice}
            </Text>
            
            {discounted && (
              <Text className="text-xs text-typography-500 line-through">
                ₹{product.basePrice}
              </Text>
            )}
          </HStack>
          
          {/* Action Buttons */}
          <Box className="flex-row">
            <Button
              className="flex-1 px-3 py-2 mr-2"
              onPress={handleAddToCart}
              disabled={isAddingToCart}
            >
              {isAddingToCart ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ButtonText size="sm">Add to cart</ButtonText>
              )}
            </Button>
            
            <Button
              variant="outline"
              className="px-3 py-2 border-outline-300"
              onPress={handleFavoritePress}
            >
              <Heart 
                size={18} 
                color={isFavorite ? "#FF4D4F" : "#475569"} 
                fill={isFavorite ? "#FF4D4F" : "none"} 
                strokeWidth={2}
              />
            </Button>
          </Box>
        </VStack>
      </Card>
    </TouchableOpacity>
  );
};

// Memoize the ProductCardComponent with React.memo
const ProductCard = memo(ProductCardComponent, (prevProps, nextProps) => {
  // Custom equality check for memoization optimization
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.isAddingToCart === nextProps.isAddingToCart &&
    prevProps.isFavorite === nextProps.isFavorite
  );
});

// Main Shop Screen Component
export default function ShopScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  
  // UI state
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  
  // Load products
  useEffect(() => {
    fetchProducts();
  }, []);
  
  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const data = await getProducts();
      setProducts(data);
      
      // Set initial price range based on actual product prices
      if (data.length > 0) {
        const prices = data.map(p => p.discountPrice || p.basePrice).filter(Boolean);
        if (prices.length) {
          setPriceRange([
            Math.floor(Math.min(...prices)),
            Math.ceil(Math.max(...prices))
          ]);
        }
      }
      
      // Load wishlist data
      await loadWishlistData();
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Could not load products. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  // Load wishlist data
  const loadWishlistData = async () => {
    try {
      setLoadingWishlist(true);
      
      // Get current user ID (replace with actual auth logic)
      const userId = 'current-user-id'; // Replace with actual auth user ID
      
      // In a real app, you would iterate through products and check their wishlist status
      // This is a simplified example - in production code you would use a batch operation
      const wishlistProducts: string[] = [];
      
      for (const product of products) {
        const isInWishlist = await getWishlistStatus(userId, product.id);
        if (isInWishlist) {
          wishlistProducts.push(product.id);
        }
      }
      
      setFavorites(wishlistProducts);
    } catch (error) {
      console.error('Error loading wishlist data:', error);
    } finally {
      setLoadingWishlist(false);
    }
  };
  
  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, []);
  
  // Get unique brands from products
  const availableBrands = useMemo(() => {
    return Array.from(new Set(
      products
        .map(p => p.brand)
        .filter(Boolean)
    )).sort();
  }, [products]);
  
  // Add to cart handler
  const handleAddToCart = useCallback(async (product) => {
    try {
      setAddingToCartId(product.id);
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
    } catch (err) {
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
    } finally {
      setAddingToCartId(null);
    }
  }, [addItem, toast]);
  
  // Toggle favorite products
  const handleToggleFavorite = useCallback(async (product) => {
    try {
      // Get current user ID (replace with actual auth logic)
      const userId = 'current-user-id'; // Replace with actual auth user ID
      
      if (favorites.includes(product.id)) {
        // Remove from wishlist
        await removeFromWishlist(userId, product.id);
        setFavorites(prev => prev.filter(id => id !== product.id));
        
        toast.show({
          render: () => (
            <Toast action="info" variant="solid">
              <VStack space="xs">
                <ToastTitle>Removed from wishlist</ToastTitle>
                <ToastDescription>{product.name} was removed from your wishlist</ToastDescription>
              </VStack>
            </Toast>
          )
        });
      } else {
        // Add to wishlist
        await addToWishlist(userId, {
          productId: product.id,
          name: product.name,
          basePrice: product.basePrice,
          discountPrice: product.discountPrice,
          featuredImage: product.featuredImage,
          brand: product.brand,
          addedAt: new Date()
        });
        setFavorites(prev => [...prev, product.id]);
        
        toast.show({
          render: () => (
            <Toast action="success" variant="solid">
              <VStack space="xs">
                <ToastTitle>Added to wishlist</ToastTitle>
                <ToastDescription>{product.name} was added to your wishlist</ToastDescription>
              </VStack>
            </Toast>
          )
        });
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to update wishlist</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    }
  }, [favorites, toast]);
  
  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      if (searchQuery && !product.name?.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !product.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !product.brand?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (selectedCategory !== 'all') {
        // Check if product has a matching categoryId or category
        const categoryMatches = 
          // Match by categoryId (string or number comparison)
          product.categoryId === selectedCategory || 
          product.categoryId === Number(selectedCategory) ||
          String(product.categoryId) === selectedCategory ||
          // Match by category name
          product.category === selectedCategory ||
          // Match by categoryName if available
          product.categoryName === selectedCategory;
          
        if (!categoryMatches) {
          return false;
        }
      }
      
      // Brand filter
      if (selectedBrands.length > 0 && (!product.brand || !selectedBrands.includes(product.brand))) {
        return false;
      }
      
      // Price filter
      const price = product.discountPrice || product.basePrice;
      if (price < priceRange[0] || price > priceRange[1]) {
        return false;
      }
      
      // Rating filter
      if (minRating > 0 && (!product.rating || product.rating < minRating)) {
        return false;
      }
      
      // Stock filter
      if (inStockOnly && (!product.stockQuantity || product.stockQuantity <= 0)) {
        return false;
      }
      
      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedBrands, priceRange, minRating, inStockOnly]);
  
  // Sort products
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    
    switch (selectedSort) {
      case 'price_asc':
        return sorted.sort((a, b) => 
          (a.discountPrice || a.basePrice) - (b.discountPrice || b.basePrice)
        );
      case 'price_desc':
        return sorted.sort((a, b) => 
          (b.discountPrice || b.basePrice) - (a.discountPrice || a.basePrice)
        );
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = a.createdAt ? 
            (typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? 
              a.createdAt.toDate() : new Date(a.createdAt)) : 
            new Date(0);
          const dateB = b.createdAt ? 
            (typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? 
              b.createdAt.toDate() : new Date(b.createdAt)) : 
            new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      case 'popular':
      default:
        // Sort by a combination of rating and review count for "popular"
        return sorted.sort((a, b) => {
          const scoreA = (a.rating || 0) * (a.reviewCount || 1);
          const scoreB = (b.rating || 0) * (b.reviewCount || 1);
          return scoreB - scoreA;
        });
    }
  }, [filteredProducts, selectedSort]);
  
  // Toggle brand selection
  const toggleBrand = useCallback((brand: string) => {
    if (!brand) return;
    
    setSelectedBrands(prev => 
      prev.includes(brand) ? 
        prev.filter(b => b !== brand) : 
        [...prev, brand]
    );
  }, []);
  
  // Reset filters
  const resetFilters = useCallback(() => {
    setSelectedCategory('all');
    setSelectedBrands([]);
    setMinRating(0);
    setInStockOnly(false);
    
    // Reset price range based on actual products
    if (products.length > 0) {
      const prices = products.map(p => p.discountPrice || p.basePrice).filter(Boolean);
      
      if (prices.length) {
        setPriceRange([
          Math.floor(Math.min(...prices)),
          Math.ceil(Math.max(...prices))
        ]);
      } else {
        setPriceRange([0, 10000]);
      }
    }
  }, [products]);
  
  // Optimized renderItem function
  const renderItem = useCallback(({ item }) => (
    <View style={viewMode === 'grid' ? styles.gridCardWrapper : styles.listCardWrapper}>
      <ProductCard
        product={item}
        viewMode={viewMode}
        onPress={handleProductPress}
        onAddToCart={handleAddToCart}
        onToggleFavorite={handleToggleFavorite}
        isAddingToCart={addingToCartId === item.id}
        isFavorite={favorites.includes(item.id)}
      />
    </View>
  ), [viewMode, handleProductPress, handleAddToCart, handleToggleFavorite, addingToCartId, favorites]);
  
  // Keyextractor optimization
  const keyExtractor = useCallback((item) => item.id.toString(), []);
  
  // Item layout optimization for FlatList
  const getItemLayout = useCallback((data, index) => {
    const itemHeight = viewMode === 'grid' ? 280 : 140; // Adjust based on your card heights
    return {
      length: itemHeight,
      offset: itemHeight * index,
      index,
    };
  }, [viewMode]);

  // Product press handler
  const handleProductPress = useCallback((id) => {
    router.push(`/product/${id}`);
  }, [router]);
  
  // Loading state
  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Icon as={Package} size="xl" color="#9CA3AF" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          size="md"
          variant="solid"
          style={styles.retryButton}
          onPress={fetchProducts}
        >
          <ButtonText>Try Again</ButtonText>
        </Button>
      </View>
    );
  }
  
  return (
    <View style={[
      styles.container, 
      { paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight }
    ]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <HStack style={styles.searchContainer}>
          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8}}>
            <Search color="#6B7280" size={18} style={{marginRight: 8}} />
            <TextInput
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{flex: 1, fontSize: 16, height: 40, color: '#111827'}}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={{padding: 8}}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Filter size={20} color="#4F46E5" />
          </TouchableOpacity>
        </HStack>
        
        {/* Categories Scrollbar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesScroll}
        >
          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === 'all' && styles.activeCategoryPill
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === 'all' && styles.activeCategoryText
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryPill,
                selectedCategory === category.id && styles.activeCategoryPill
              ]}
              onPress={() => setSelectedCategory(
                selectedCategory === category.id ? 'all' : category.id
              )}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.activeCategoryText
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Results Controls */}
      <HStack style={styles.resultsBar}>
        <Text style={styles.resultsCount}>
          {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'}
        </Text>
        
        <HStack space="md" alignItems="center">
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortModalVisible(true)}
          >
            <HStack space="xs" alignItems="center">
              <ArrowUpDown size={16} color="#4B5563" />
              <Text style={styles.sortButtonText}>Sort</Text>
              <ChevronDown size={16} color="#4B5563" />
            </HStack>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.viewToggleButton}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? (
              <List size={18} color="#4B5563" />
            ) : (
              <Grid size={18} color="#4B5563" />
            )}
          </TouchableOpacity>
        </HStack>
      </HStack>
      
      {/* Product List */}
      {sortedProducts.length > 0 ? (
        <FlatList
          data={sortedProducts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode} // Force re-render on view mode change
          contentContainerStyle={styles.productList}
          columnWrapperStyle={viewMode === 'grid' ? styles.productRow : null}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
          // Performance optimizations
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          initialNumToRender={8}
          // Avoid excessive re-renders
          extraData={[viewMode, addingToCartId, favorites]}
        />
      ) : (
        // Empty state
        <View style={styles.emptyState}>
          <Package size={60} color="#D1D5DB" />
          <Heading size="md" style={styles.emptyStateTitle}>No products found</Heading>
          <Text style={styles.emptyStateText}>
            Try adjusting your filters or search term
          </Text>
          
          {(searchQuery || selectedCategory !== 'all' || selectedBrands.length > 0) && (
            <Button
              size="md"
              variant="outline"
              style={styles.clearFiltersButton}
              onPress={() => {
                resetFilters();
                setSearchQuery('');
              }}
            >
              <ButtonText>Clear All Filters</ButtonText>
            </Button>
          )}
        </View>
      )}
      
      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandleBar} />
              <Heading size="md" style={styles.modalTitle}>Filter Products</Heading>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <X size={22} color="#1F2937" />
              </TouchableOpacity>
            </View>
            
            {/* Modal Content */}
            <ScrollView 
              style={styles.modalContent} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filterContentContainer}
            >
              {/* Categories */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Categories</Text>
                <View style={styles.filterChips}>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.filterChip,
                        selectedCategory === category.id && styles.activeFilterChip
                      ]}
                      onPress={() => setSelectedCategory(
                        selectedCategory === category.id ? 'all' : category.id
                      )}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedCategory === category.id && styles.activeFilterChipText
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price Range</Text>
                <View style={styles.priceInputContainer}>
                  <View style={styles.priceInputGroup}>
                    <Text style={styles.priceInputLabel}>Min Price</Text>
                    <View style={styles.priceInputWrapper}>
                      <Text style={styles.currencySymbol}>₹</Text>
                      <TextInput
                        style={styles.priceInput}
                        value={priceRange[0].toString()}
                        onChangeText={(text) => {
                          const value = Math.max(0, parseInt(text) || 0);
                          setPriceRange([
                            value, 
                            Math.max(value + 100, priceRange[1])
                          ]);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                  
                  <View style={styles.priceRangeSeparator} />
                  
                  <View style={styles.priceInputGroup}>
                    <Text style={styles.priceInputLabel}>Max Price</Text>
                    <View style={styles.priceInputWrapper}>
                      <Text style={styles.currencySymbol}>₹</Text>
                      <TextInput
                        style={styles.priceInput}
                        value={priceRange[1].toString()}
                        onChangeText={(text) => {
                          const value = Math.max(priceRange[0], parseInt(text) || priceRange[0] + 100);
                          setPriceRange([priceRange[0], value]);
                        }}
                        keyboardType="numeric"
                        placeholder="10000"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                </View>
                
                {/* Quick Price Buttons */}
                <View style={styles.quickPriceButtons}>
                  {[
                    { label: 'Under ₹1000', range: [0, 1000] },
                    { label: '₹1000 - ₹5000', range: [1000, 5000] },
                    { label: 'Above ₹5000', range: [5000, 10000] }
                  ].map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.quickPriceButton,
                        (priceRange[0] === option.range[0] && 
                         priceRange[1] === option.range[1]) && 
                         styles.activeQuickPriceButton
                      ]}
                      onPress={() => setPriceRange(option.range)}
                    >
                      <Text style={[
                        styles.quickPriceButtonText,
                        (priceRange[0] === option.range[0] && 
                         priceRange[1] === option.range[1]) && 
                         styles.activeQuickPriceButtonText
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Brands */}
              {availableBrands.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Brands</Text>
                  <View style={styles.filterChips}>
                    {availableBrands.map(brand => (
                      <TouchableOpacity
                        key={brand}
                        style={[
                          styles.filterChip,
                          selectedBrands.includes(brand) && styles.activeFilterChip
                        ]}
                        onPress={() => toggleBrand(brand)}
                      >
                        {selectedBrands.includes(brand) && (
                          <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        )}
                        <Text style={[
                          styles.filterChipText,
                          selectedBrands.includes(brand) && styles.activeFilterChipText
                        ]}>
                          {brand}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Rating */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
                <Text style={styles.ratingDescription}>
                  {minRating > 0 ? `${minRating}+ stars and above` : 'Any rating'}
                </Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <TouchableOpacity
                      key={rating}
                      style={styles.starButton}
                      onPress={() => setMinRating(rating === minRating ? 0 : rating)}
                    >
                      <Star
                        size={32}
                        color={rating <= minRating ? "#FFAB00" : "#E2E8F0"}
                        fill={rating <= minRating ? "#FFAB00" : "none"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Stock Filter */}
              <View style={styles.filterSectionLast}>
                <View style={styles.stockFilterRow}>
                  <VStack>
                    <Text style={styles.filterSectionTitle}>In-Stock Only</Text>
                    <Text style={styles.stockDescription}>
                      Only show products currently in stock
                    </Text>
                  </VStack>
                  <TouchableOpacity
                    style={[
                      styles.toggleSwitch,
                      inStockOnly && styles.toggleSwitchActive
                    ]}
                    onPress={() => setInStockOnly(!inStockOnly)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.toggleThumb,
                      inStockOnly && styles.toggleThumbActive
                    ]} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            
            {/* Filter Action Buttons */}
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sortModalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandleBar} />
              <Heading size="md" style={styles.modalTitle}>Sort By</Heading>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSortModalVisible(false)}
              >
                <X size={22} color="#1F2937" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {SORT_OPTIONS.map((option) => {
                const isSelected = selectedSort === option.id;
                const Icon = option.icon;
                
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.sortOption,
                      isSelected && styles.selectedSortOption
                    ]}
                    onPress={() => {
                      setSelectedSort(option.id);
                      setSortModalVisible(false);
                    }}
                  >
                    <HStack space="sm" alignItems="center">
                      <View style={[
                        styles.sortOptionIconContainer,
                        isSelected && styles.selectedSortOptionIconContainer
                      ]}>
                        <Icon
                          size={18}
                          color={isSelected ? "#FFFFFF" : "#4B5563"}
                        />
                      </View>
                      <Text style={[
                        styles.sortOptionText,
                        isSelected && styles.selectedSortOptionText
                      ]}>
                        {option.label}
                      </Text>
                    </HStack>
                    
                    {isSelected && (
                      <View style={styles.selectedCheckmark}>
                        <Check size={18} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <View style={styles.sortModalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setSortModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    backgroundColor: '#4F46E5',
    marginTop: 16,
  },
  
  // Header Styles
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  searchContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginRight: 12,
    backgroundColor: '#F8FAFC',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Categories Styles
  categoriesScroll: {
    marginTop: 12,
    height: 44,
  },
  categoriesContainer: {
    paddingLeft: 4,
    paddingRight: 16,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeCategoryPill: {
    backgroundColor: '#3B82F6', // Our accent blue color for selected pills
    borderColor: '#3B82F6',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  activeCategoryText: {
    color: '#FFFFFF', // White text color when pill is selected
    fontWeight: '600',
  },
  
  // Results Bar Styles
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginHorizontal: 4,
  },
  viewToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  // Product List Styles
  gridCardContainer: {
    flex: 1,
  },
  listCardContainer: {
    width: '100%',
  },
  gridCardWrapper: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  listCardWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  productList: {
    padding: 8,
    paddingBottom: 80, // Extra padding at bottom for better UX
  },
  productRow: {
    justifyContent: 'flex-start', // Changed from space-between to allow proper flex wrapping
  },
  
  // Product Card Styles - Fixed image coverage
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  gridCard: {
    width: CARD_WIDTH,
  },
  listCard: {
    width: LIST_CARD_WIDTH,
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden', // Ensures image stays within container bounds
  },
  gridImageContainer: {
    width: '100%',
    height: '0',
    paddingBottom: '100%' // Creates a square aspect ratio
  },
  listImageContainer: {
    width: 120,
    height: '100%',
  },
  productImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover', // Web equivalent of resizeMode
    position: 'absolute', // For the grid view to fill the container properly
    top: 0,
    left: 0,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  productInfo: {
    padding: 12,
  },
  gridProductInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  listProductInfo: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  brandText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  reviewCount: {
    fontSize: 12,
    color: '#94A3B8',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  originalPriceText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  listAddToCartButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeFilterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Empty State Styles
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    marginTop: 20,
    marginBottom: 8,
    color: '#1E293B',
    fontWeight: '600',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearFiltersButton: {
    paddingHorizontal: 24,
    borderColor: '#CBD5E1',
    marginTop: 8,
  },
  
  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'relative',
  },
  modalHandleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    marginBottom: 16,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 18,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    padding: 4,
  },
  modalContent: {
    maxHeight: '70%',
    paddingHorizontal: 20,
  },
  
  // Filter Modal Styles
  filterModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  filterContentContainer: {
    paddingBottom: 120, // Extra space for buttons at bottom
    paddingTop: 8,
  },
  filterSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterSectionLast: {
    marginBottom: 32,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    margin: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterChip: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  } ,
  
  // Price Range Styles
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInputGroup: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '500',
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '500',
    color: '#475569',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1E293B',
  },
  priceRangeSeparator: {
    width: 16,
    height: 2,
    backgroundColor: '#94A3B8',
    marginHorizontal: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  quickPriceButtons: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
  },
  quickPriceButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  activeQuickPriceButton: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  quickPriceButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  activeQuickPriceButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  
  // Rating Styles
  ratingDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starButton: {
    padding: 4,
  },
  
  // Stock Filter Styles
  stockFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#4F46E5',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  
  // Filter Actions Styles
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  resetButton: {
    flex: 0.48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  applyButton: {
    flex: 0.48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Sort Modal Styles
  sortModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectedSortOption: {
    backgroundColor: '#F1F5F9',
  },
  sortOptionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSortOptionIconContainer: {
    backgroundColor: '#4F46E5',
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
  selectedSortOptionText: {
    fontWeight: '600',
  },
  selectedCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortModalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569'
  }
});