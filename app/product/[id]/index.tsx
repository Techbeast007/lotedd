// Redesigned product detail view with Gluestack UI and Tailwind

import { Button, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { FormControl } from '@/components/ui/form-control';
import { HStack } from '@/components/ui/hstack';
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { getCurrentUser } from '@/services/authService';
import { incrementProductViewCount } from '@/services/biddingService';
import { useCart } from '@/services/context/CartContext';
import { getRelatedProducts, Product } from '@/services/productService';
import { addToWishlist, getWishlistStatus, removeFromWishlist } from '@/services/wishlistService';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, orderBy, query, where } from '@react-native-firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Heart, Home, Info, MessageCircle, Package, Share2, Shirt, ShoppingBag, Smartphone, Star, TagIcon, Utensils } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image as RNImage,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Review-related functions
const getProductReviews = async (productId: string): Promise<Review[]> => {
  try {
    const db = getFirestore();
    const reviewsRef = collection(db, 'products', productId, 'reviews');
    const reviewsQuery = query(reviewsRef, orderBy('createdAt', 'desc'));
    const reviewsSnapshot = await getDocs(reviewsQuery);
    
    return reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      liked: false // Default value
    }) as Review);
  } catch (error) {
    console.error('Error getting product reviews:', error);
    return [];
  }
};

const addReview = async (reviewData: Omit<Review, 'id' | 'liked' | 'likes'>): Promise<void> => {
  try {
    const db = getFirestore();
    const reviewsRef = collection(db, 'products', reviewData.productId, 'reviews');
    
    // Add likes field to the review data
    const reviewWithLikes = {
      ...reviewData,
      likes: 0
    };
    
    await addDoc(reviewsRef, reviewWithLikes);
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
};

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  brand?: string;
  basePrice: number;
  discountPrice?: number;
  stockQuantity: number;
  images: string[];
  featuredImage?: string;
  categories: string[];
  category?: string;         // Added to match possible field in Firestore
  categoryId?: string | number; // Added to match possible field in Firestore
  categoryName?: string;     // Added to match possible field in Firestore
  attributes?: Record<string, string>;
  rating?: number;
  reviewCount?: number;
  viewCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: any;
  likes: number;
  liked?: boolean;
}

export default function ProductDetailScreen() {
  const params = useLocalSearchParams();
  const { id: productId } = params;
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const currentUser = getCurrentUser();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [reviewsData, setReviewsData] = useState<Review[]>([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  
  // Review form state
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Check if product is in wishlist
  const checkWishlistStatus = useCallback(async (pid: string) => {
    if (!currentUser) return;
    
    try {
      setIsWishlistLoading(true);
      const status = await getWishlistStatus(currentUser.uid, pid);
      setIsInWishlist(status);
    } catch (err) {
      console.error('Error checking wishlist status:', err);
    } finally {
      setIsWishlistLoading(false);
    }
  }, [currentUser]);

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId) {
        setError('Product ID not provided');
        setIsLoading(false);
        return;
      }

      try {
        const db = getFirestore();
        const productRef = doc(db, 'products', productId as string);
        const productDoc = await getDoc(productRef);

        if (productDoc.exists()) {
          const productData = { 
            id: productDoc.id, 
            ...productDoc.data(),
            // Ensure essential properties exist to prevent undefined errors
            categories: productDoc.data()?.categories || [],
            images: productDoc.data()?.images || [],
            stockQuantity: productDoc.data()?.stockQuantity || 0
          } as ProductDetail;
          
          setProduct(productData);
          
          // Increment view count
          incrementProductViewCount(productId as string);
          
          // Get related products based on first category or other properties
          let categoryToUse = '';
          
          // Try multiple approaches to find a valid category
          if (productData.categories && productData.categories.length > 0) {
            categoryToUse = productData.categories[0];
          } else if (productData.category) {
            categoryToUse = productData.category;
          } else if (productData.categoryId) {
            categoryToUse = String(productData.categoryId);
          }
          
          console.log('Looking for related products with category:', categoryToUse);
            
          let related: Product[] = [];
          try {
            // Try with category first
            related = await getRelatedProducts(categoryToUse, productId as string, 6) || [];
            
            // If no results, try with brand as fallback
            if (related.length === 0 && productData.brand) {
              console.log('No products found by category, trying with brand:', productData.brand);
              // In a real app, you'd have a getProductsByBrand function
              // For now, let's fetch some random products as fallback
              const firestore = getFirestore();
              const productsRef = collection(firestore, 'products');
              const querySnapshot = await getDocs(query(productsRef, where('brand', '==', productData.brand)));
              
              related = querySnapshot.docs
                .filter(doc => doc.id !== productId)
                .map(doc => ({ id: doc.id, ...doc.data() } as Product));
            }
          } catch (relatedError) {
            console.error('Error fetching related products:', relatedError);
            related = []; // Ensure related is always an array
          }
          
          // Convert Product[] to ProductDetail[] with proper null checks and debugging
          console.log('Related products from API:', related.length, related.map(p => p.id));
          
          // If no related products found, try to get any random products as a fallback
          if (related.length === 0) {
            console.log('No related products found. Getting fallback products...');
            try {
              const firestore = getFirestore();
              const productsRef = collection(firestore, 'products');
              // Get a small batch of products without filtering (we'll filter the current product out later)
              const fallbackSnapshot = await getDocs(query(productsRef, 
                // Limit to 20 products to filter from
                // We can't directly query for id != productId in Firestore
              ));
              
              const fallbackProducts = fallbackSnapshot.docs
                .filter(doc => doc.id !== productId)
                .map(doc => ({ id: doc.id, ...doc.data() } as Product));
              
              // Take up to 6 random products
              related = fallbackProducts
                .sort(() => 0.5 - Math.random())
                .slice(0, 6);
                
              console.log('Fallback products found:', related.length);
            } catch (fallbackError) {
              console.error('Error getting fallback products:', fallbackError);
            }
          }
          
          const relatedAsProductDetail = related
            .filter(p => p !== null && p !== undefined)
            .map(p => {
              const productDetail = {
                ...p,
                id: p.id || '',
                name: p.name || 'Product',
                description: p.description || '',
                basePrice: p.basePrice || 0,
                categories: p.category ? [p.category] : [],
                images: p.images || [],
                stockQuantity: p.stockQuantity || 0,
              } as ProductDetail;
              
              return productDetail;
            });
          
          console.log('Related products mapped:', relatedAsProductDetail.length);
          setRelatedProducts(relatedAsProductDetail);
          
          // Fetch reviews
          fetchReviews(productId as string);
          
          // Check wishlist status
          checkWishlistStatus(productId as string);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, [productId, checkWishlistStatus]);
  
  // Fetch product reviews
  const fetchReviews = async (pid: string) => {
    try {
      const reviews = await getProductReviews(pid);
      setReviewsData(reviews);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };
  
  // Handle adding to wishlist
  const handleToggleWishlist = async () => {
    if (!currentUser) {
      router.push('/(auth)');
      return;
    }
    
    try {
      setIsWishlistLoading(true);
      
      if (isInWishlist) {
        await removeFromWishlist(currentUser.uid, productId as string);
        setIsInWishlist(false);
        
        toast.show({
          render: () => (
            <Toast action="success" variant="solid">
              <VStack space="xs">
                <ToastTitle>Removed from Wishlist</ToastTitle>
                <ToastDescription>Product removed from your wishlist</ToastDescription>
              </VStack>
            </Toast>
          )
        });
      } else {
        if (!product) return;
        
        await addToWishlist(currentUser.uid, {
          productId: productId as string,
          name: product.name,
          basePrice: product.basePrice,
          discountPrice: product.discountPrice,
          featuredImage: product.featuredImage || (product.images?.length > 0 ? product.images[0] : ''),
          brand: product.brand || '',
          addedAt: new Date()
        });
        
        setIsInWishlist(true);
        
        toast.show({
          render: () => (
            <Toast action="success" variant="solid">
              <VStack space="xs">
                <ToastTitle>Added to Wishlist</ToastTitle>
                <ToastDescription>Product saved to your wishlist</ToastDescription>
              </VStack>
            </Toast>
          )
        });
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      
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
    } finally {
      setIsWishlistLoading(false);
    }
  };
  
  // Handle adding to cart
  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      setIsAddingToCart(true);
      
      // Create a product object that matches the expected structure
      const productForCart: Product = {
        id: product.id,
        name: product.name,
        basePrice: product.basePrice,
        discountPrice: product.discountPrice,
        stockQuantity: product.stockQuantity,
        description: product.description,
        featuredImage: product.featuredImage || (product.images && product.images.length > 0 ? product.images[0] : ''),
        images: product.images
      };
      
      // Add item to cart
      await addItem(productForCart);
      
      // If the product is in the wishlist, remove it
      if (isInWishlist && currentUser && product.id) {
        await removeFromWishlist(currentUser.uid, product.id);
        setIsInWishlist(false);
        
        toast.show({
          render: () => (
            <Toast action="success" variant="solid">
              <VStack space="xs">
                <ToastTitle>Added to Cart</ToastTitle>
                <ToastDescription>Product moved from wishlist to cart</ToastDescription>
              </VStack>
            </Toast>
          )
        });
      } else {
        toast.show({
          render: () => (
            <Toast action="success" variant="solid">
              <VStack space="xs">
                <ToastTitle>Added to Cart</ToastTitle>
                <ToastDescription>Product added to your cart</ToastDescription>
              </VStack>
            </Toast>
          )
        });
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to add to cart</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    } finally {
      setIsAddingToCart(false);
    }
  };
  
  // Submit a review
  const handleSubmitReview = async () => {
    if (!currentUser || !product || reviewRating === 0 || !reviewComment.trim()) return;
    
    try {
      setIsSubmittingReview(true);
      
      await addReview({
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous User',
        userAvatar: currentUser.photoURL || undefined,
        productId: product.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: new Date(),
      });
      
      // Refresh reviews
      fetchReviews(product.id);
      
      // Reset form
      setReviewRating(0);
      setReviewComment('');
      
      // Close modal
      setIsReviewModalVisible(false);
      
      toast.show({
        render: () => (
          <Toast action="success" variant="solid">
            <VStack space="xs">
              <ToastTitle>Review Submitted</ToastTitle>
              <ToastDescription>Thank you for your feedback!</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    } catch (err) {
      console.error('Error submitting review:', err);
      
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to submit review</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Center className="flex-1 bg-white">
        <Spinner size="large" />
        <Text className="mt-2 text-gray-700">Loading product details...</Text>
      </Center>
    );
  }
  
  // Error state
  if (error || !product) {
    return (
      <Center className="flex-1 bg-white px-4">
        <View className="mb-4">
          <Info size={60} color="#9CA3AF" />
        </View>
        <Text className="text-xl font-bold mb-2 text-center">Something went wrong</Text>
        <Text className="mb-6 text-center text-gray-500">{error || 'Product not found'}</Text>
        <Button onPress={() => router.back()} action="primary">
          <ButtonText>Go Back</ButtonText>
        </Button>
      </Center>
    );
  }
  
  // Calculate discount percentage
  const discounted = product.discountPrice != null && product.discountPrice < product.basePrice;
  const discountPercentage = discounted && product.discountPrice != null ? 
    Math.round(((product.basePrice - product.discountPrice) / product.basePrice) * 100) : 0;
    
  // Format price with thousand separators
  const formatPrice = (price: number) => {
    return `₹${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };
  
  // Prepare all images for carousel
  const allProductImages = (() => {
    let images: string[] = [];
    if (product.featuredImage && product.featuredImage.trim() && (!product.images || !product.images.includes(product.featuredImage))) {
      images.push(product.featuredImage);
    }
    if (product.images && product.images.length > 0) {
      images = [...images, ...product.images.filter(Boolean)];
    }
    // Remove duplicates
    images = Array.from(new Set(images)).filter(Boolean);
    console.log('Final product images:', images);
    return images.length > 0 ? images : ['https://via.placeholder.com/800x800?text=No+Image'];
  })();

  // Utility function to get appropriate icon based on category or brand
  const getCategoryIcon = (item: ProductDetail) => {
    // Get category or brand to determine icon
    const category = item.categories?.[0]?.toLowerCase() || 
                    item.category?.toLowerCase() || 
                    item.categoryName?.toLowerCase() || 
                    item.brand?.toLowerCase() || '';
    
    // Return appropriate icon based on category/brand keywords
    if (category.includes('apparel') || category.includes('fashion') || 
        category.includes('cloth') || category.includes('wear')) {
      return <Shirt size={40} color="#FFFFFF" />;
    } else if (category.includes('electron') || category.includes('tech') || 
              category.includes('phone') || category.includes('gadget')) {
      return <Smartphone size={40} color="#FFFFFF" />;
    } else if (category.includes('home') || category.includes('furniture') || 
              category.includes('decor') || category.includes('indoor')) {
      return <Home size={40} color="#FFFFFF" />;
    } else if (category.includes('food') || category.includes('beverage') || 
              category.includes('grocery') || category.includes('kitchen')) {
      return <Utensils size={40} color="#FFFFFF" />;
    } else if (category.includes('industrial') || category.includes('supply') || 
              category.includes('equipment') || category.includes('tool')) {
      return <Package size={40} color="#FFFFFF" />;
    } else {
      // Default icon
      return <TagIcon size={40} color="#FFFFFF" />;
    }
  };

  // Get background color based on category
  const getCategoryColor = (item: ProductDetail) => {
    const category = item.categories?.[0]?.toLowerCase() || 
                    item.category?.toLowerCase() || 
                    item.categoryName?.toLowerCase() || 
                    item.brand?.toLowerCase() || '';
    
    if (category.includes('apparel') || category.includes('fashion') || category.includes('cloth')) {
      return '#3B82F6'; // Blue
    } else if (category.includes('electron') || category.includes('tech')) {
      return '#10B981'; // Green
    } else if (category.includes('home') || category.includes('furniture')) {
      return '#F59E0B'; // Amber
    } else if (category.includes('food') || category.includes('beverage')) {
      return '#EC4899'; // Pink
    } else if (category.includes('industrial') || category.includes('supply')) {
      return '#8B5CF6'; // Purple
    } else {
      // Generate a consistent color based on the first character of the category/brand
      const chars = category ? category.charCodeAt(0) : 0;
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4'];
      return colors[chars % colors.length];
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with back button and actions */}
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleToggleWishlist}
              disabled={isWishlistLoading}
            >
              {isWishlistLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Heart 
                  size={20} 
                  color="#FFFFFF"
                  fill={isInWishlist ? "#FFFFFF" : "transparent"}
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                Alert.alert('Share', 'Share product functionality will be implemented here.');
              }}
            >
              <Share2 size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Product Images - LARGE CAROUSEL */}
        <View style={styles.imageCarousel}>
          <FlatList
            data={allProductImages}
            keyExtractor={(item, index) => `image-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const slideWidth = Dimensions.get('window').width;
              const index = Math.floor(event.nativeEvent.contentOffset.x / slideWidth);
              setSelectedImageIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={styles.imageSlideLarge}>
                <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                  {/* Use React Native Image for better control */}
                  <RNImage 
                    source={{ uri: item }}
                    style={{
                      width: Dimensions.get('window').width * 0.9, // 90% of screen width
                      height: 400, // Fixed height for better appearance
                    }}
                    resizeMode="contain"
                  />
                </View>
                {discounted && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
                  </View>
                )}
              </View>
            )}
          />
          
          {/* Indicator dots */}
          {allProductImages.length > 1 && (
            <View style={styles.indicatorContainer}>
              {allProductImages.map((_, index) => (
                <View
                  key={`dot-${index}`}
                  style={[
                    styles.indicator,
                    index === selectedImageIndex && styles.activeIndicator
                  ]}
                />
              ))}
            </View>
          )}
        </View>
        
        {/* Product Information */}
        <View style={styles.productInfoContainer}>
          {/* Brand and Rating Row */}
          <View style={styles.brandRatingRow}>
            <Text style={styles.brandText}>{product.brand || 'Brand'}</Text>
            
            <View style={styles.ratingContainer}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>
                {product.rating ? product.rating.toFixed(1) : '0'} 
                <Text style={styles.reviewCountText}>
                  ({product.reviewCount || 0} reviews)
                </Text>
              </Text>
            </View>
          </View>
          
          {/* Product Name */}
          <Text style={styles.productName}>
            {product.name}
          </Text>
          
          {/* Price Section */}
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              {formatPrice(discounted && product.discountPrice != null ? product.discountPrice : product.basePrice)}
            </Text>
            
            {discounted && (
              <Text style={styles.originalPrice}>
                {formatPrice(product.basePrice)}
              </Text>
            )}
          </View>
          
          {/* Stock Status */}
          <View style={[
            styles.stockBadge,
            product.stockQuantity > 0 ? styles.inStockBadge : styles.outOfStockBadge
          ]}>
            <Text style={[
              styles.stockText,
              product.stockQuantity > 0 ? styles.inStockText : styles.outOfStockText
            ]}>
              {product.stockQuantity > 0 ? `In Stock (${product.stockQuantity})` : "Out of Stock"}
            </Text>
          </View>
          
          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>
            {product.description}
          </Text>
          
          <View style={styles.divider} />
          
          {/* Reviews Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            
            <TouchableOpacity
              style={styles.writeReviewButton}
              onPress={() => {
                if (!currentUser) {
                  router.push('/(auth)');
                  return;
                }
                setIsReviewModalVisible(true);
              }}
            >
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          </View>
          
          {/* Review List */}
          {reviewsData.length > 0 ? (
            <View style={styles.reviewsContainer}>
              {reviewsData.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {review.userName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewerName}>{review.userName}</Text>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star 
                              key={star} 
                              size={14} 
                              color="#F59E0B" 
                              fill={star <= review.rating ? "#F59E0B" : "none"}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.createdAt.toDate()).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.reviewComment}>
                    {review.comment}
                  </Text>
                </View>
              ))}
              
              {reviewsData.length > 3 && (
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => {
                    // Navigate to all reviews
                    Alert.alert('View All Reviews', 'Navigate to all reviews page');
                  }}
                >
                  <Text style={styles.seeAllText}>See All Reviews</Text>
                  <ChevronRight size={16} color="#3B82F6" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyReviewsContainer}>
              <MessageCircle size={40} color="#CBD5E1" />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <TouchableOpacity
                style={styles.beFirstButton}
                onPress={() => {
                  if (!currentUser) {
                    router.push('/(auth)');
                    return;
                  }
                  setIsReviewModalVisible(true);
                }}
              >
                <Text style={styles.beFirstText}>Be the first to review</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.divider} />
          
          {/* Related Products */}
          <View style={styles.relatedProductsSection}>
            <Text style={styles.sectionTitle}>Related Products</Text>
            
            {relatedProducts.length > 0 ? (
              <FlatList
                data={relatedProducts}
                keyExtractor={(item, index) => `related-${item.id || index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 4, paddingRight: 8, paddingVertical: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.relatedProductCard}
                    onPress={() => {
                      router.push(`/product/${item.id}`);
                    }}
                  >
                    <View 
                      style={{ 
                        width: '100%', 
                        height: 140, 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        backgroundColor: getCategoryColor(item)
                      }}
                    >
                      <View style={{
                        width: 70,
                        height: 70,
                        borderRadius: 35,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        {getCategoryIcon(item)}
                      </View>
                    </View>
                    
                    <View style={styles.relatedProductInfo}>
                      <Text style={styles.relatedBrandText}>
                        {item.brand || 'Brand'}
                      </Text>
                      <Text style={styles.relatedProductName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.relatedProductPrice}>
                        {formatPrice(item.discountPrice || item.basePrice)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                  <View style={styles.emptyRelatedContainer}>
                    <Text style={styles.noRelatedText}>No related products found</Text>
                  </View>
                )}
              />
            ) : (
              <View style={styles.emptyRelatedContainer}>
                <Text style={styles.noRelatedText}>No related products found</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            product.stockQuantity <= 0 && styles.disabledButton
          ]}
          onPress={handleAddToCart}
          disabled={isAddingToCart || product.stockQuantity <= 0}
        >
          <ShoppingBag size={20} color="#FFFFFF" />
          <Text style={styles.addToCartText}>
            {isAddingToCart ? 'Adding...' : (product.stockQuantity <= 0 ? 'Out of Stock' : 'Add to Cart')}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Review Modal */}
      <Modal isOpen={isReviewModalVisible} onClose={() => setIsReviewModalVisible(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text className="text-lg font-bold">Write a Review</Text>
            <ModalCloseButton>
              <Text className="text-lg font-bold">×</Text>
            </ModalCloseButton>
          </ModalHeader>
          
          <ModalBody>
            <VStack space="md">
              <FormControl>
                <Text className="mb-2">Rating</Text>
                <HStack space="sm">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Pressable
                      key={star}
                      onPress={() => setReviewRating(star)}
                    >
                      <Star
                        size={32}
                        color="#F59E0B"
                        fill={star <= reviewRating ? "#F59E0B" : "none"}
                      />
                    </Pressable>
                  ))}
                </HStack>
              </FormControl>
              
              <FormControl>
                <Text className="mb-2">Review</Text>
                {/* Using TextArea wrapper */}
                <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, padding: 8, height: 120 }}>
                  <TextInput
                    multiline
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    placeholder="Write your review here..."
                    style={{ height: '100%', textAlignVertical: 'top' }}
                  />
                </View>
              </FormControl>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <HStack space="sm" style={{ width: '100%' }}>
              <Button
                style={{ flex: 1 }}
                variant="outline"
                onPress={() => setIsReviewModalVisible(false)}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              
              <Button
                style={{ flex: 1 }}
                onPress={handleSubmitReview}
                disabled={reviewRating === 0 || !reviewComment.trim() || isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <Spinner size="small" />
                ) : (
                  <ButtonText>Submit</ButtonText>
                )}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </View>
  );
}

// Updated styles with better padding, spacing, and larger images
const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageCarousel: {
    width: '100%',
    height: 450, // Increased height for larger images
    backgroundColor: 'white',
  },
  imageSlideLarge: {
    width: Dimensions.get('window').width,
    height: 450,
    backgroundColor: 'white',
  },
  productImageLarge: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  activeIndicator: {
    backgroundColor: '#3B82F6',
  },
  productInfoContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 20,
  },
  brandRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 14,
    color: '#6B7280',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewCountText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  originalPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  inStockBadge: {
    backgroundColor: '#DCFCE7',
  },
  outOfStockBadge: {
    backgroundColor: '#FEE2E2',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inStockText: {
    color: '#16A34A',
  },
  outOfStockText: {
    color: '#DC2626',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  writeReviewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 4,
  },
  writeReviewText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  reviewsContainer: {
    gap: 16,
    marginBottom: 16,
  },
  reviewCard: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    color: '#6B7280',
  },
  reviewerName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reviewComment: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  seeAllText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyReviewsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noReviewsText: {
    color: '#9CA3AF',
    marginTop: 8,
  },
  beFirstButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 4,
  },
  beFirstText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  relatedProductsSection: {
    marginBottom: 24,
  },
  relatedProductCard: {
    width: 160,
    marginRight: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  relatedProductInfo: {
    padding: 12,
    backgroundColor: 'white',
  },
  relatedBrandText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  relatedProductName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    height: 40,
  },
  relatedProductPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  emptyRelatedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  noRelatedText: {
    color: '#9CA3AF',
  },
  bottomBar: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  addToCartText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  }
});