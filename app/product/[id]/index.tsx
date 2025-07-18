import { Button, ButtonIcon, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { getCurrentUser } from '@/services/authService';
import { addToCart } from '@/services/cartService';
import { ParticipantType } from '@/services/chatService';
import { useChatContext } from '@/services/context/ChatContext';
import { Product, getProductById, getRelatedProducts } from '@/services/productService';
import { getReviews, submitReview } from '@/services/reviewService';
import { addToWishlist, removeFromWishlist } from '@/services/wishlistService';
// Video import for native module
import { ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ExpoSharing from 'expo-sharing';
import { ChevronLeft, Heart, MessageSquare, Share as ShareIcon, Star, Truck } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userReview, setUserReview] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const scrollViewRef = useRef<FlatList>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const { getOrCreateConversation } = useChatContext();
  
  const loadData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Load product details
      const productData = await getProductById(id as string);
      if (productData) {
        setProduct(productData);
        
        // Load related products based on category
        if (productData.category) {
          const related = await getRelatedProducts(productData.category, id as string, 6);
          setRelatedProducts(related);
        }
        
        // Load reviews
        const reviewsData = await getReviews(id as string);
        setReviews(reviewsData || []);
        
        // Check if product is in wishlist
        const user = getCurrentUser();
        if (user) {
          const isInWishlist = productData.wishlistedBy?.includes(user.uid);
          setInWishlist(!!isInWishlist);
        }
      }
    } catch (error) {
      console.error('Error loading product data:', error);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to load product details</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);
  
  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Handle media scroll
  const onMediaScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setSelectedMediaIndex(index);
  };
  
  // Handle wishlist toggle
  const handleWishlistToggle = async () => {
    if (!product) return;
    
    const user = getCurrentUser();
    if (!user) {
      router.push('/(auth)');
      return;
    }
    
    try {
      if (inWishlist) {
        await removeFromWishlist(user.uid, product.id as string);
        setInWishlist(false);
        toast.show({
          render: () => (
            <Toast action="success" variant="solid">
              <ToastDescription>Removed from wishlist</ToastDescription>
            </Toast>
          )
        });
      } else {
        await addToWishlist(user.uid, {
          productId: product.id as string,
          name: product.name,
          basePrice: product.basePrice,
          discountPrice: product.discountPrice,
          featuredImage: product.featuredImage || (product.images && product.images.length > 0 ? product.images[0] : ''),
          brand: product.brand,
          addedAt: new Date() // Will be overwritten by server timestamp
        });
        setInWishlist(true);
        toast.show({
          render: () => (
            <Toast action="success" variant="solid">
              <ToastDescription>Added to wishlist</ToastDescription>
            </Toast>
          )
        });
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <ToastDescription>Failed to update wishlist</ToastDescription>
          </Toast>
        )
      });
    }
  };
  
  // Handle add to cart
  const handleAddToCart = async () => {
    if (!product) return;
    
    const user = getCurrentUser();
    if (!user) {
      router.push('/(auth)');
      return;
    }
    
    try {
      setAddingToCart(true);
      // Pass the full product object to addToCart
      await addToCart(product);
      toast.show({
        render: () => (
          <Toast action="success" variant="solid">
            <ToastDescription>Added to cart</ToastDescription>
          </Toast>
        )
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <ToastDescription>Failed to add to cart</ToastDescription>
          </Toast>
        )
      });
    } finally {
      setAddingToCart(false);
    }
  };
  
  // Handle submit review
  const handleSubmitReview = async () => {
    if (!product || userRating === 0) {
      toast.show({
        render: () => (
          <Toast action="warning" variant="solid">
            <ToastDescription>Please select a rating</ToastDescription>
          </Toast>
        )
      });
      return;
    }
    
    const user = getCurrentUser();
    if (!user) {
      router.push('/(auth)');
      return;
    }
    
    try {
      setSubmittingReview(true);
      await submitReview(product.id as string, userRating, userReview);
      
      // Refresh reviews
      const updatedReviews = await getReviews(product.id as string);
      setReviews(updatedReviews || []);
      
      // Reset form and close modal
      setUserRating(0);
      setUserReview('');
      setReviewModalVisible(false);
      
      toast.show({
        render: () => (
          <Toast action="success" variant="solid">
            <ToastDescription>Review submitted successfully</ToastDescription>
          </Toast>
        )
      });
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <ToastDescription>Failed to submit review</ToastDescription>
          </Toast>
        )
      });
    } finally {
      setSubmittingReview(false);
    }
  };
  
  // Handle contact seller
  const handleContactSeller = async () => {
    if (!product || !product.sellerId) return;
    
    const user = getCurrentUser();
    if (!user) {
      router.push('/(auth)');
      return;
    }
    
    try {
      // Get seller info to create a conversation
      const otherParticipant = {
        id: product.sellerId || '',
        name: 'Seller', // Default name since we don't have seller name in the product
        type: ParticipantType.SELLER,
      };
      
      // Create a conversation related to this product
      const conversationId = await getOrCreateConversation(
        otherParticipant,
        {
          type: 'product',
          id: product.id,
          name: product.name
        }
      );
      
      if (conversationId) {
        router.push(`/messages/${conversationId}`);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <ToastDescription>Failed to contact seller</ToastDescription>
          </Toast>
        )
      });
    }
  };
  
  // Share product using ExpoSharing
  const handleShareProduct = async () => {
    if (!product) return;
    
    try {
      // Create share message
      const shareMessage = `Check out ${product.name} on Lotedd!\n\nPrice: ₹${product.basePrice}`;
      
      // Check if sharing is available
      const isAvailable = await ExpoSharing.isAvailableAsync();
      if (isAvailable) {
        // If image is available, share with image
        if (product.featuredImage) {
          await ExpoSharing.shareAsync(product.featuredImage, {
            dialogTitle: `Share ${product.name}`,
            mimeType: 'image/jpeg',
            UTI: 'public.jpeg',
          });
        } else {
          // Otherwise just share text
          await ExpoSharing.shareAsync(shareMessage, {
            dialogTitle: `Share ${product.name}`,
            mimeType: 'text/plain',
          });
        }
      } else {
        toast.show({
          render: () => (
            <Toast action="info" variant="solid">
              <ToastDescription>Sharing is not available on this device</ToastDescription>
            </Toast>
          )
        });
      }
    } catch (error) {
      console.log('Error sharing product:', error);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <ToastDescription>Failed to share product</ToastDescription>
          </Toast>
        )
      });
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Spinner size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </SafeAreaView>
    );
  }
  
  // Render error state if product not found
  if (!product) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <Button onPress={() => router.back()}>
          <ButtonText>Go Back</ButtonText>
        </Button>
      </SafeAreaView>
    );
  }
  
  // Prepare media items (both images and videos)
  const mediaItems = [
    ...(product.images || []).map(image => ({ type: 'image', url: image })),
    // Including videos but display will be handled differently due to native module issues
    ...(product.videos || []).map(video => ({ type: 'video', url: video }))
  ];
  
  // Calculate average rating
  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;
    
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <HStack style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#1F2937" size={24} />
        </TouchableOpacity>
        
        <HStack style={styles.headerActions}>
          <TouchableOpacity onPress={handleShareProduct} style={styles.iconButton}>
            <ShareIcon color="#1F2937" size={22} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleWishlistToggle} style={styles.iconButton}>
            <Heart 
              color={inWishlist ? "#EF4444" : "#1F2937"} 
              fill={inWishlist ? "#EF4444" : "none"} 
              size={22} 
            />
          </TouchableOpacity>
        </HStack>
      </HStack>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Media gallery */}
        <View style={styles.mediaContainer}>
          <FlatList
            ref={scrollViewRef}
            data={mediaItems.length > 0 ? mediaItems : [{ type: 'image', url: 'https://via.placeholder.com/400x400?text=No+Image' }]}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onMediaScroll}
            renderItem={({ item }) => (
              <View style={styles.mediaItem}>
                {item.type === 'image' ? (
                  <Image
                    source={{ uri: item.url }}
                    alt={product.name}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Video
                    source={{ uri: item.url }}
                    style={styles.productImage}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    shouldPlay={false}
                  />
                )}
              </View>
            )}
            keyExtractor={(item, index) => `media-${index}`}
          />
          
          {/* Pagination dots */}
          {mediaItems.length > 1 && (
            <HStack style={styles.pagination}>
              {mediaItems.map((_, index) => (
                <View
                  key={`dot-${index}`}
                  style={[
                    styles.paginationDot,
                    index === selectedMediaIndex && styles.paginationDotActive
                  ]}
                />
              ))}
            </HStack>
          )}
        </View>
        
        {/* Product info */}
        <VStack style={styles.productInfo}>
          {/* Basic details */}
          <HStack style={styles.productHeader}>
            <VStack style={styles.productTitleContainer}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productBrand}>{product.brand}</Text>
            </VStack>
            
            <VStack style={styles.productPriceContainer}>
              <Text style={styles.productPrice}>₹{product.basePrice}</Text>
              {product.mrp && product.mrp > product.basePrice && (
                <HStack style={styles.discountContainer}>
                  <Text style={styles.mrpPrice}>₹{product.mrp}</Text>
                  <Text style={styles.discountText}>
                    {Math.round(((product.mrp - product.basePrice) / product.mrp) * 100)}% off
                  </Text>
                </HStack>
              )}
            </VStack>
          </HStack>
          
          {/* Ratings */}
          <Pressable onPress={() => setReviewModalVisible(true)}>
            <HStack style={styles.ratingsContainer}>
              {avgRating > 0 ? (
                <>
                  <HStack style={styles.ratingStars}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={`star-${index}`}
                        size={16}
                        color="#F59E0B"
                        fill={index < Math.floor(avgRating) ? "#F59E0B" : "none"}
                        strokeWidth={1.5}
                      />
                    ))}
                  </HStack>
                  <Text style={styles.ratingText}>
                    {avgRating.toFixed(1)} • {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </Text>
                </>
              ) : (
                <Text style={styles.noRatingsText}>No reviews yet • Be the first to review</Text>
              )}
            </HStack>
          </Pressable>
          
          {/* Stock and Delivery */}
          <HStack style={styles.stockDeliveryContainer}>
            <HStack style={[styles.tagContainer, product.stockQuantity > 0 ? styles.inStockTag : styles.outOfStockTag]}>
              <Text style={[styles.tagText, product.stockQuantity > 0 ? styles.inStockText : styles.outOfStockText]}>
                {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
              </Text>
            </HStack>
            
            <HStack style={styles.deliveryContainer}>
              <Truck size={14} color="#4F46E5" />
              <Text style={styles.deliveryText}>Free Delivery</Text>
            </HStack>
          </HStack>
          
          {/* Description */}
          <VStack style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </VStack>
          
          {/* Additional Product Details */}
          <VStack style={styles.additionalDetailsContainer}>
            <Text style={styles.sectionTitle}>Additional Details</Text>
            
            {/* MOQ */}
            {product.moq && product.moq > 0 && (
              <HStack style={styles.detailRow}>
                <Text style={styles.detailLabel}>Minimum Order Quantity:</Text>
                <Text style={styles.detailValue}>{product.moq} units</Text>
              </HStack>
            )}
            
            {/* Product Condition */}
            {product.condition && (
              <HStack style={styles.detailRow}>
                <Text style={styles.detailLabel}>Condition:</Text>
                <Text style={styles.detailValue}>
                  {product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}
                </Text>
              </HStack>
            )}
            
            {/* Damage Percentage (only show if condition is not "new") */}
            {product.condition && product.condition !== 'new' && product.damagePercentage && product.damagePercentage > 0 && (
              <HStack style={styles.detailRow}>
                <Text style={styles.detailLabel}>Damage Percentage:</Text>
                <Text style={styles.detailValue}>{product.damagePercentage}%</Text>
              </HStack>
            )}
            
            {/* Weight (with kg unit) */}
            {product.weight && (
              <HStack style={styles.detailRow}>
                <Text style={styles.detailLabel}>Weight:</Text>
                <Text style={styles.detailValue}>{product.weight} kg</Text>
              </HStack>
            )}
            
            {/* Dimensions (with cm unit) */}
            {product.dimensions && (
              <HStack style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dimensions:</Text>
                <Text style={styles.detailValue}>{product.dimensions} (cm)</Text>
              </HStack>
            )}
          </VStack>
          
          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <VStack style={styles.specificationsContainer}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {Object.entries(product.specifications).map(([key, value], index) => (
                <HStack key={`spec-${index}`} style={styles.specificationRow}>
                  <Text style={styles.specificationKey}>{key}</Text>
                  <Text style={styles.specificationValue}>{value}</Text>
                </HStack>
              ))}
            </VStack>
          )}
          
          {/* Reviews section */}
          <VStack style={styles.reviewsContainer}>
            <HStack style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
              <Button 
                size="xs" 
                variant="outline" 
                onPress={() => setReviewModalVisible(true)}
              >
                <ButtonText>Write a review</ButtonText>
              </Button>
            </HStack>
            
            {reviews.length > 0 ? (
              reviews.slice(0, 3).map((review, index) => (
                <VStack key={`review-${index}`} style={styles.reviewItem}>
                  <HStack style={styles.reviewHeader}>
                    <HStack>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={`review-star-${i}`}
                          size={14}
                          color="#F59E0B"
                          fill={i < review.rating ? "#F59E0B" : "none"}
                          strokeWidth={1.5}
                        />
                      ))}
                    </HStack>
                    <Text style={styles.reviewDate}>
                      {review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : ''}
                    </Text>
                  </HStack>
                  <Text style={styles.reviewerName}>{review.userName || 'Anonymous'}</Text>
                  {review.review && <Text style={styles.reviewText}>{review.review}</Text>}
                </VStack>
              ))
            ) : (
              <Text style={styles.noReviewsText}>No reviews yet. Be the first to review this product!</Text>
            )}
            
            {reviews.length > 3 && (
              <Button 
                size="sm" 
                variant="outline" 
                onPress={() => setReviewModalVisible(true)}
                style={styles.viewAllReviewsButton}
              >
                <ButtonText>View all reviews</ButtonText>
              </Button>
            )}
          </VStack>
          
          {/* Related products */}
          {relatedProducts.length > 0 && (
            <VStack style={styles.relatedProductsContainer}>
              <Text style={styles.sectionTitle}>Related Products</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack style={styles.relatedProductsScroll}>
                  {relatedProducts.map((item, index) => (
                    <TouchableOpacity 
                      key={`related-${index}`} 
                      style={styles.relatedProductItem}
                      onPress={() => {
                        // Navigate to the product detail page
                        router.push(`/product/${item.id}`);
                      }}
                    >
                      <Image
                        source={{ 
                          uri: item.images && item.images.length > 0 
                            ? item.images[0] 
                            : 'https://via.placeholder.com/100x100?text=No+Image'
                        }}
                        alt={item.name}
                        style={styles.relatedProductImage}
                      />
                      <Text style={styles.relatedProductName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.relatedProductPrice}>
                        ₹{item.basePrice}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </ScrollView>
            </VStack>
          )}
        </VStack>
      </ScrollView>
      
      {/* Bottom action buttons */}
      <HStack style={styles.bottomActions}>
        <Button
          size="lg"
          variant="outline"
          style={styles.contactSellerButton}
          onPress={handleContactSeller}
        >
          <ButtonIcon as={MessageSquare} size="sm" />
          <ButtonText>Chat</ButtonText>
        </Button>
        
        <Button
          size="lg"
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          disabled={addingToCart || product.stockQuantity <= 0}
        >
          {addingToCart ? (
            <ButtonSpinner />
          ) : (
            <ButtonText>
              {product.stockQuantity > 0 ? 'Add to Cart' : 'Out of Stock'}
            </ButtonText>
          )}
        </Button>
      </HStack>
      
      {/* Review modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reviewModalVisible}
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Write a Review</Text>
            
            <Text style={styles.ratingLabel}>Your Rating:</Text>
            <HStack style={styles.ratingSelector}>
              {Array.from({ length: 5 }).map((_, index) => (
                <TouchableOpacity
                  key={`rating-${index}`}
                  onPress={() => setUserRating(index + 1)}
                  style={styles.ratingButton}
                >
                  <Star
                    size={30}
                    color="#F59E0B"
                    fill={index < userRating ? "#F59E0B" : "none"}
                    strokeWidth={1.5}
                  />
                </TouchableOpacity>
              ))}
            </HStack>
            
            <Text style={styles.reviewLabel}>Your Review (optional):</Text>
            <TextInput
              style={styles.reviewInput}
              multiline
              value={userReview}
              onChangeText={setUserReview}
              placeholder="Share your experience with this product..."
              placeholderTextColor="#9CA3AF"
            />
            
            <HStack style={styles.modalActions}>
              <Button
                variant="outline"
                style={styles.cancelButton}
                onPress={() => setReviewModalVisible(false)}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              
              <Button
                style={styles.submitButton}
                onPress={handleSubmitReview}
                disabled={submittingReview || userRating === 0}
              >
                {submittingReview ? (
                  <ButtonSpinner />
                ) : (
                  <ButtonText>Submit</ButtonText>
                )}
              </Button>
            </HStack>
          </View>
        </View>
      </Modal>
      
      {/* All reviews modal (will be shown when "View all reviews" is clicked) */}
      {/* This part can be implemented later when needed */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  mediaContainer: {
    position: 'relative',
    height: width * 0.8, // Maintain aspect ratio
    backgroundColor: '#F3F4F6',
  },
  mediaItem: {
    width: width,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productVideo: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#4F46E5',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  productInfo: {
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    color: '#6B7280',
  },
  productPriceContainer: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  mrpPrice: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  ratingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 6,
  },
  noRatingsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  descriptionContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  stockDeliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tagContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  inStockTag: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  outOfStockTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inStockText: {
    color: '#059669',
  },
  outOfStockText: {
    color: '#EF4444',
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 12,
    color: '#4F46E5',
    marginLeft: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  additionalDetailsContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    textAlign: 'right',
  },
  specificationsContainer: {
    marginBottom: 16,
  },
  specificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  specificationKey: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  specificationValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 2,
  },
  reviewsContainer: {
    marginBottom: 16,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  viewAllReviewsButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  relatedProductsContainer: {
    marginBottom: 20,
  },
  relatedProductsScroll: {
    paddingRight: 16,
  },
  relatedProductItem: {
    width: 120,
    marginRight: 12,
  },
  relatedProductImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 6,
  },
  relatedProductName: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 2,
  },
  relatedProductPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  contactSellerButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#4F46E5',
  },
  addToCartButton: {
    flex: 2,
    backgroundColor: '#4F46E5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ratingButton: {
    padding: 8,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
  },
});