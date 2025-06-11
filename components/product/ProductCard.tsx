import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { useCart } from '@/services/context/CartContext';
import { Product } from '@/services/productService';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, Heart, MessageCircle, ShoppingCart, Star } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;

interface ProductCardProps {
  product: Product;
  hideActions?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, hideActions = false }) => {
  const router = useRouter();
  const { addToCart } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  
  // Enhanced debugging: Log complete product details to identify issues
  useEffect(() => {console.log(product)
    console.log(`Product ${product.id} - Complete data:`, JSON.stringify(product, null, 2));
    console.log(`Product ${product.id} - featuredImage:`, product.featuredImage);
    console.log(`Product ${product.id} - images:`, product.images);
  }, [product]);
  
  // Determine the best image to use with better fallback
  const imageUrl = product.featuredImage ? product.featuredImage : 
                  (product.images && product.images.length > 0 ? product.images[0] : 
                  'https://via.placeholder.com/150?text=Product');
  
  // More detailed logging for image URL
  useEffect(() => {
    console.log(`Product ${product.id} - Using image URL:`, imageUrl);
    if (imageUrl === product.featuredImage) {
      console.log(`Product ${product.id} - Using featuredImage URL`);
    } else if (product.images && product.images.length > 0) {
      console.log(`Product ${product.id} - Using first image from images array`);
    } else {
      console.log(`Product ${product.id} - Using fallback placeholder`);
    }
  }, [imageUrl, product]);
  
  const handleViewProduct = () => {
    router.push(`/product/${product.id}`);
  };
  
  const handleChatWithSeller = () => {
    router.push({
      pathname: '/chat',
      params: { 
        sellerId: product.sellerId,
        productId: product.id
      }
    });
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleAddToCart = () => {
    setAddingToCart(true);
    setTimeout(() => {
      addToCart(product);
      setAddingToCart(false);
    }, 300);
  };

  const renderStars = (rating: number) => {
    return (
      <HStack space="xs">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star}
            size={12}
            color={star <= rating ? '#F59E0B' : '#D1D5DB'}
            fill={star <= rating ? '#F59E0B' : 'none'}
          />
        ))}
        <Text style={styles.ratingText}>({product.reviewCount || 0})</Text>
      </HStack>
    );
  };

  return (
    <Box style={styles.container}>
      <TouchableOpacity 
        activeOpacity={0.9} 
        style={styles.cardContainer}
        onPress={handleViewProduct}
      >
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          )}
          
          <Image 
            alt={product.name}
            source={{ uri: imageUrl }} 
            style={styles.image}
            resizeMode="cover"
            onLoadStart={() => {
              setImageLoading(true);
              console.log(`Starting to load image: ${imageUrl}`);
            }}
            onLoad={() => {
              setImageLoading(false);
              console.log(`Successfully loaded image: ${imageUrl}`);
            }}
            onError={() => {
              console.log(`Failed to load image: ${imageUrl}`);
              console.log(`Image loading error for product ${product.id}`);
              setImageLoading(false);
              setImageError(true);
            }}
          />
          
          {imageError && (
            <View style={styles.errorImageContainer}>
              <Text style={styles.errorImageText}>{product.name.charAt(0)}</Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
            <Heart 
              size={18} 
              color={isFavorite ? "#EF4444" : "white"} 
              fill={isFavorite ? "#EF4444" : "none"} 
            />
          </TouchableOpacity>
          
          {product.discountPercentage > 0 && (
            <LinearGradient
              colors={['#FF416C', '#FF4B2B']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.discountBadge}
            >
              <Text style={styles.discountText}>{`${product.discountPercentage}% OFF`}</Text>
            </LinearGradient>
          )}
          
          {product.freeShipping && (
            <View style={styles.freeShippingBadge}>
              <Text style={styles.freeShippingText}>Free Shipping</Text>
            </View>
          )}
        </View>
        
        <Box style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          
          <HStack style={styles.priceContainer}>
            <Text style={styles.price}>₹{product.discountPrice || product.basePrice}</Text>
            {product.discountPrice && (
              <Text style={styles.originalPrice}>₹{product.basePrice}</Text>
            )}
          </HStack>
          
          {product.rating && (
            <View style={styles.ratingContainer}>
              {renderStars(product.rating)}
            </View>
          )}
          
          {product.stockQuantity !== undefined && (
            <HStack style={styles.stockContainer}>
              <View style={[
                styles.stockIndicator,
                { backgroundColor: product.stockQuantity > 50 ? '#10B981' : '#F59E0B' }
              ]} />
              <Text style={styles.stockText}>
                {product.stockQuantity > 100 ? 'In stock' : `${product.stockQuantity} left`}
              </Text>
            </HStack>
          )}
          
          {!hideActions && (
            <HStack style={styles.actionContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={handleViewProduct}
              >
                <Eye size={14} color="#3B82F6" />
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.cartButton]} 
                onPress={handleAddToCart}
                disabled={addingToCart}
              >
                {addingToCart ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <ShoppingCart size={14} color="#FFFFFF" />
                    <Text style={styles.chatButtonText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.chatButton]} 
                onPress={handleChatWithSeller}
              >
                <MessageCircle size={14} color="#FFFFFF" />
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            </HStack>
          )}
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginRight: 12,
    marginBottom: 12,
  },
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: CARD_WIDTH,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  loaderContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  errorImageContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  errorImageText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  freeShippingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeShippingText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#1F2937',
    height: 40,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stockText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  viewButton: {
    backgroundColor: '#EBF5FF',
    marginRight: 4,
  },
  viewButtonText: {
    color: '#3B82F6',
    fontWeight: '500',
    fontSize: 12,
    marginLeft: 4,
  },
  cartButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 4,
  },
  chatButton: {
    backgroundColor: '#3B82F6',
    marginLeft: 4,
  },
  chatButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
    marginLeft: 4,
  },
});

export default ProductCard;