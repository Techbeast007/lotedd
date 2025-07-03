import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { incrementProductViewCount } from '@/services/biddingService';
import { useCart } from '@/services/context/CartContext';
import { getRelatedProducts } from '@/services/productService';
import { collection, doc, getDoc, getDocs, getFirestore, limit, query } from '@react-native-firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Heart, Info, Share2, ShoppingBag, Star } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  featuredImage: string;
  images: string[];
  basePrice: number;
  discountPrice?: number;
  stockQuantity: number;
  brand?: string;
  categoryName?: string;
  category?: string;
  colors?: string[];
  sizes?: string[];
  status?: string;
  sellerId?: string;
  rating?: number;
  reviewCount?: number;
  featured?: boolean;
}

interface ProductVariant {
  color?: string;
  size?: string;
}

const ProductCard = memo(({
  product,
  onPress,
  onAddToCart,
  onToggleFavorite,
  isAddingToCart,
  isFavorite = false,
}: {
  product: ProductDetail;
  onPress?: (id: string) => void;
  onAddToCart?: (product: ProductDetail) => void;
  onToggleFavorite?: (product: ProductDetail) => void;
  isAddingToCart?: boolean;
  isFavorite?: boolean;
}) => {
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
      style={{ width: '100%' }}
    >
      <Card className="p-3 rounded-lg">
        {/* Image Container with Discount Badge and Favorite Button */}
        <Box className="relative">
          <Image
            source={{ uri: imageUrl }}
            className="h-[150px] w-full rounded-md"
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
          <Text className="text-sm font-medium mb-1 mt-1" numberOfLines={2}>
            {product.name}
          </Text>
          
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
});

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  
  // State
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mainImage, setMainImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>({});
  const [relatedProducts, setRelatedProducts] = useState<ProductDetail[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Screen dimensions
  const { width } = Dimensions.get('window');
  
  useEffect(() => {
    // Animation when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    
    const fetchProductDetails = async () => {
      try {
        if (!id) {
          console.error('No product ID provided');
          setIsLoading(false);
          return;
        }
        
        console.log('Fetching product with ID:', id);
        const firestore = getFirestore();
        const productRef = doc(firestore, 'products', id as string);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists) {
          console.error('Product not found');
          setIsLoading(false);
          return;
        }
        
        const productData = productDoc.data();
        if (!productData) {
          console.error('Product data is empty');
          setIsLoading(false);
          return;
        }
        
        const productWithId = {
          id: productDoc.id,
          name: productData.name || '',
          description: productData.description || '',
          shortDescription: productData.shortDescription || '',
          featuredImage: productData.imageUrl || productData.featuredImage || '',
          images: productData.images || [],
          basePrice: productData.basePrice || 0,
          discountPrice: productData.discountPrice || 0,
          stockQuantity: productData.stockQuantity || 0,
          brand: productData.brand || '',
          categoryName: productData.categoryName || '',
          category: productData.category || '',
          colors: productData.colors || [],
          sizes: productData.sizes || [],
          status: productData.status || '',
          sellerId: productData.sellerId || '',
          rating: productData.rating || 0,
          reviewCount: productData.reviewCount || 0,
          featured: productData.featured || false,
        };
        
        setProduct(productWithId);
        setMainImage(productWithId.featuredImage);
        
        // Track product view
        try {
          await incrementProductViewCount(productDoc.id);
          console.log('Product view tracked for:', productDoc.id);
        } catch (viewError) {
          console.error('Error tracking product view:', viewError);
        }
        
        // Set initial variant if available
        const initialVariant: ProductVariant = {};
        if (productWithId.colors && productWithId.colors.length > 0) {
          initialVariant.color = productWithId.colors[0];
        }
        if (productWithId.sizes && productWithId.sizes.length > 0) {
          initialVariant.size = productWithId.sizes[0];
        }
        setSelectedVariant(initialVariant);
        
        // Fetch related products
        fetchRelatedProducts(productWithId.category || productWithId.categoryName || '');
        
      } catch (error) {
        console.error('Error fetching product details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProductDetails();
  }, [id, fadeAnim, scaleAnim]);
  
  // Fetch related products
  const fetchRelatedProducts = async (category: string) => {
    try {
      setLoadingRelated(true);
      
      if (!category) {
        setLoadingRelated(false);
        return;
      }
      
      // If getRelatedProducts doesn't exist or fails, implement fallback
      try {
        const related = await getRelatedProducts(category, id as string);
        setRelatedProducts(related || []);
      } catch (error) {
        console.error('Error with getRelatedProducts:', error);
        
        // Fallback implementation - fetch related products directly
        const firestore = getFirestore();
        const productsRef = collection(firestore, 'products');
        const q = query(productsRef, limit(5));
        
        const querySnapshot = await getDocs(q);
        const related = [];
        
        querySnapshot.forEach((doc) => {
          if (doc.id !== id) {
            related.push({
              id: doc.id,
              ...doc.data()
            });
          }
        });
        
        setRelatedProducts(related);
      }
      
    } catch (error) {
      console.error('Error fetching related products:', error);
      setRelatedProducts([]); // Set empty array on error
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      if (!product) return;
      
      setAddingToCart(true);
      
      // Create product with selected variants
      const productToAdd = {
        ...product,
        selectedColor: selectedVariant.color,
        selectedSize: selectedVariant.size,
      };
      
      await addItem(productToAdd, quantity);
      
      // Show success toast
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
      console.error('Error adding to cart:', error);
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
      setAddingToCart(false);
    }
  };
  
  const handleBuyNow = async () => {
    try {
      if (!product) return;
      
      // Add to cart first
      await handleAddToCart();
      
      // Navigate to checkout
      router.push('/checkout');
      
    } catch (error) {
      console.error('Error proceeding to checkout:', error);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (product?.stockQuantity && newQuantity > product.stockQuantity) {
      toast.show({
        render: () => (
          <Toast action="warning" variant="solid">
            <VStack space="xs">
              <ToastTitle>Cannot add more</ToastTitle>
              <ToastDescription>Maximum available stock reached</ToastDescription>
            </VStack>
          </Toast>
        )
      });
      return;
    }
    setQuantity(newQuantity);
  };
  
  const handleColorSelection = (color: string) => {
    setSelectedVariant(prev => ({ ...prev, color }));
  };
  
  const handleSizeSelection = (size: string) => {
    setSelectedVariant(prev => ({ ...prev, size }));
  };
  
  const handleShareProduct = () => {
    // Share functionality
    Alert.alert('Share', 'Sharing functionality coming soon!');
  };
  
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    
    // Show toast
    toast.show({
      render: () => (
        <Toast action={isFavorite ? "info" : "success"} variant="solid">
          <VStack space="xs">
            <ToastTitle>{isFavorite ? 'Removed from wishlist' : 'Added to wishlist'}</ToastTitle>
            <ToastDescription>
              {product?.name} was {isFavorite ? 'removed from' : 'added to'} your wishlist
            </ToastDescription>
          </VStack>
        </Toast>
      )
    });
  };
  
  // Function to add related product to cart
  const handleRelatedProductAddToCart = useCallback(async (product: ProductDetail) => {
    try {
      setAddingToCartId(product.id);
      
      // Create product with default variants
      const productToAdd = {
        ...product,
        selectedColor: product.colors && product.colors.length > 0 ? product.colors[0] : undefined,
        selectedSize: product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined,
      };
      
      await addItem(productToAdd, 1);
      
      // Show success toast
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
      console.error('Error adding related product to cart:', error);
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
  }, [addItem, toast, setAddingToCartId]);

  // Function to toggle favorite for related products
  const toggleFavoriteProduct = useCallback((product: ProductDetail) => {
    setFavoriteProducts(prev => {
      const isCurrentlyFavorite = prev.includes(product.id);
      
      // Show toast
      toast.show({
        render: () => (
          <Toast action={isCurrentlyFavorite ? "info" : "success"} variant="solid">
            <VStack space="xs">
              <ToastTitle>{isCurrentlyFavorite ? 'Removed from wishlist' : 'Added to wishlist'}</ToastTitle>
              <ToastDescription>
                {product.name} was {isCurrentlyFavorite ? 'removed from' : 'added to'} your wishlist
              </ToastDescription>
            </VStack>
          </Toast>
        )
      });
      
      // Update favorites list
      if (isCurrentlyFavorite) {
        return prev.filter(id => id !== product.id);
      } else {
        return [...prev, product.id];
      }
    });
  }, [toast, setFavoriteProducts]);
  
  // Related product item renderer
  const renderRelatedProduct = useCallback(({ item }: { item: ProductDetail }) => {
    const isAddingToCart = addingToCartId === item.id;
    const isFavorite = favoriteProducts.includes(item.id);
    
    return (
      <Box style={{ width: width * 0.6, marginRight: 16 }}>
        <ProductCard
          product={item}
          onPress={(id) => {
            // Reset state and navigate to the new product
            setIsLoading(true);
            router.push(`/product/${id}`);
          }}
          onAddToCart={(product) => handleRelatedProductAddToCart(product)}
          onToggleFavorite={(product) => toggleFavoriteProduct(product)}
          isAddingToCart={isAddingToCart}
          isFavorite={isFavorite}
        />
      </Box>
    );
  }, [router, width, addingToCartId, favoriteProducts, handleRelatedProductAddToCart, toggleFavoriteProduct]);

  if (isLoading) {
    return (
      <Box className="flex-1 justify-center items-center bg-white">
        <Spinner size="large" color="primary" />
        <Text className="mt-4 text-gray-600">Loading product details...</Text>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box className="flex-1 justify-center items-center bg-white">
        <Icon as={Info} size="xl" color="gray" />
        <Text className="text-xl font-semibold text-gray-800 mt-4">Product not found</Text>
        <Text className="text-gray-600 text-center mb-6 px-6 mt-2">
          The product you're looking for doesn't exist or has been removed.
        </Text>
        <Button 
          className="mt-2 bg-blue-600" 
          onPress={() => router.push('/shop')}
        >
          <ButtonText>Continue Shopping</ButtonText>
        </Button>
      </Box>
    );
  }

  // Calculate discount percentage
  const discountPercentage = product.discountPrice && product.basePrice 
    ? Math.round(((product.basePrice - product.discountPrice) / product.basePrice) * 100)
    : 0;

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          paddingTop: insets.top 
        }
      ]}
    >
      {/* Header */}
      <HStack 
        className="w-full bg-white px-4 py-4 items-center justify-between"
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <ArrowLeft size={20} color="#333" />
        </TouchableOpacity>
        
        <Text className="text-lg font-semibold text-gray-800">Product Details</Text>
        
        <HStack space="md">
          <TouchableOpacity 
            onPress={handleShareProduct}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Share2 size={18} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={toggleFavorite}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Heart 
              size={18} 
              color={isFavorite ? "#ff4b4b" : "#333"} 
              fill={isFavorite ? "#ff4b4b" : "none"} 
              strokeWidth={2}
            />
          </TouchableOpacity>
        </HStack>
      </HStack>
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Main Image */}
        <Box className="w-full relative bg-gray-50">
          <Image 
            source={{ uri: mainImage || product.featuredImage }}
            alt={product.name}
            className="w-full h-[350px]"
            contentFit="contain"
          />
          
          {discountPercentage > 0 && (
            <Box className="absolute top-4 left-4 bg-red-500 px-3 py-1 rounded-full">
              <Text className="text-white font-medium text-xs">
                {discountPercentage}% OFF
              </Text>
            </Box>
          )}
          
          {product.stockQuantity <= 0 && (
            <Box className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 items-center justify-center">
              <Box className="bg-black bg-opacity-70 px-6 py-3 rounded-lg">
                <Text className="text-white font-bold text-lg">OUT OF STOCK</Text>
              </Box>
            </Box>
          )}
        </Box>
        
        {/* Image Gallery */}
        {product.images && product.images.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="py-4 px-4"
          >
            <TouchableOpacity 
              onPress={() => setMainImage(product.featuredImage)}
              className={`mr-3 rounded-md border-2 overflow-hidden ${
                mainImage === product.featuredImage ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              <Image 
                source={{ uri: product.featuredImage }}
                className="w-20 h-20"
                contentFit="cover"
                alt="thumbnail"
              />
            </TouchableOpacity>
            
            {product.images.map((img, index) => (
              <TouchableOpacity 
                key={index}
                onPress={() => setMainImage(img)}
                className={`mr-3 rounded-md border-2 overflow-hidden ${
                  mainImage === img ? 'border-blue-500' : 'border-gray-200'
                }`}
              >
                <Image 
                  source={{ uri: img }}
                  className="w-20 h-20"
                  contentFit="cover"
                  alt="thumbnail"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        
        {/* Product Info */}
        <VStack className="px-4 py-2 space-y-3">
          {/* Price and Name section */}
          <VStack className="space-y-2">
            <Text className="text-2xl font-bold text-gray-800">
              {product.name}
            </Text>
            
            {product.shortDescription && (
              <Text className="text-gray-600">{product.shortDescription}</Text>
            )}
            
            <HStack className="items-center space-x-2 mt-1">
              <HStack className="items-center space-x-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star}
                    size={16} 
                    color="#FFB800" 
                    fill={star <= (product.rating || 0) ? "#FFB800" : "none"}
                  />
                ))}
              </HStack>
              <Text className="text-gray-600 text-sm">
                {product.rating?.toFixed(1) || "0.0"} 
                {product.reviewCount ? ` (${product.reviewCount} reviews)` : ''}
              </Text>
            </HStack>
            
            <HStack className="items-baseline space-x-2 mt-1">
              <Text className="text-2xl font-bold text-gray-900">
                ₹{product.discountPrice || product.basePrice}
              </Text>
              
              {product.discountPrice && (
                <Text className="text-lg text-gray-400 line-through">
                  ₹{product.basePrice}
                </Text>
              )}
              
              {discountPercentage > 0 && (
                <Text className="text-sm text-green-600 font-medium">
                  {discountPercentage}% off
                </Text>
              )}
            </HStack>
          </VStack>
          
          {/* Divider */}
          <Box className="h-[1px] bg-gray-200 my-2" />
          
          {/* Product Details section */}
          <VStack className="space-y-4">
            {/* Color selection */}
            {product.colors && product.colors.length > 0 && (
              <VStack className="space-y-2">
                <Text className="text-gray-800 font-medium">Select Color:</Text>
                <HStack className="flex-wrap">
                  {product.colors.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleColorSelection(color)}
                      className={`mr-3 mb-2 px-4 py-2 rounded-md ${
                        selectedVariant.color === color 
                          ? 'bg-blue-100 border border-blue-500' 
                          : 'bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <Text 
                        className={selectedVariant.color === color 
                          ? 'text-blue-700 font-medium' 
                          : 'text-gray-700'
                        }
                      >
                        {color}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>
            )}
            
            {/* Size selection */}
            {product.sizes && product.sizes.length > 0 && (
              <VStack className="space-y-2">
                <Text className="text-gray-800 font-medium">Select Size:</Text>
                <HStack className="flex-wrap">
                  {product.sizes.map((size, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSizeSelection(size)}
                      className={`mr-3 mb-2 w-12 h-12 rounded-md items-center justify-center ${
                        selectedVariant.size === size 
                          ? 'bg-blue-100 border border-blue-500' 
                          : 'bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <Text 
                        className={selectedVariant.size === size 
                          ? 'text-blue-700 font-medium' 
                          : 'text-gray-700'
                        }
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>
            )}
            
            {/* Product metadata */}
            <VStack className="space-y-2 bg-gray-50 p-4 rounded-lg">
              <HStack className="justify-between">
                <Text className="text-gray-600">Brand:</Text>
                <Text className="text-gray-800 font-medium">{product.brand || 'Generic'}</Text>
              </HStack>
              
              <Box className="h-[1px] bg-gray-200" />
              
              <HStack className="justify-between">
                <Text className="text-gray-600">Category:</Text>
                <Text className="text-gray-800 font-medium">{product.categoryName || 'Uncategorized'}</Text>
              </HStack>
              
              <Box className="h-[1px] bg-gray-200" />
              
              {/* Stock Status */}
              <HStack className="justify-between">
                <Text className="text-gray-600">Availability:</Text>
                {product.stockQuantity > 0 ? (
                  <Text className="text-green-600 font-medium">In Stock ({product.stockQuantity} items)</Text>
                ) : (
                  <Text className="text-red-600 font-medium">Out of Stock</Text>
                )}
              </HStack>
            </VStack>
            
            {/* Quantity Selector */}
            <VStack className="space-y-2">
              <Text className="text-gray-800 font-medium">Quantity:</Text>
              <HStack className="items-center space-x-4">
                <TouchableOpacity
                  onPress={() => handleQuantityChange(quantity - 1)}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                  disabled={quantity <= 1}
                >
                  <Text className="text-2xl font-semibold text-gray-600">-</Text>
                </TouchableOpacity>
                
                <Text className="text-lg font-semibold text-gray-800 w-10 text-center">{quantity}</Text>
                
                <TouchableOpacity
                  onPress={() => handleQuantityChange(quantity + 1)}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Text className="text-2xl font-semibold text-gray-600">+</Text>
                </TouchableOpacity>
              </HStack>
            </VStack>
            
            {/* Description */}
            <VStack className="space-y-3">
              <HStack className="items-center justify-between">
                <Text className="text-lg font-semibold text-gray-800">Description</Text>
                <TouchableOpacity>
                  <ChevronRight size={20} color="#666" />
                </TouchableOpacity>
              </HStack>
              <Text className="text-gray-600 leading-6">{product.description}</Text>
            </VStack>
          </VStack>
          
          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <VStack className="space-y-3 mt-4">
              <Text className="text-lg font-semibold text-gray-800">You may also like</Text>
              
              <Box className="mt-2">
                <FlatList
                  data={relatedProducts}
                  renderItem={renderRelatedProduct}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 16 }}
                  ListEmptyComponent={
                    loadingRelated ? (
                      <Box className="w-full py-4 items-center justify-center">
                        <ActivityIndicator size="small" color="#4F46E5" />
                      </Box>
                    ) : null
                  }
                />
              </Box>
            </VStack>
          )}
          
          {/* Spacing at bottom */}
          <Box className="h-16" />
        </VStack>
      </ScrollView>
      
      {/* Bottom Action Buttons */}
      <HStack 
        className="w-full bg-white px-4 py-4 items-center justify-between border-t border-gray-200"
        style={styles.bottomBar}
      >
        <Button
          variant="outline"
          className="flex-1 mr-3 border-blue-500"
          onPress={handleAddToCart}
          disabled={product.stockQuantity <= 0 || addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <>
              <ShoppingBag size={20} color="#3B82F6" className="mr-2" />
              <ButtonText className="text-blue-500">Add to Cart</ButtonText>
            </>
          )}
        </Button>
        
        <Button
          className="flex-1 bg-blue-600"
          onPress={handleBuyNow}
          disabled={product.stockQuantity <= 0 || addingToCart}
        >
          <ButtonText>Buy Now</ButtonText>
        </Button>
      </HStack>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  bottomBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    paddingBottom: 20, // Extra padding for bottom safety
  }
});