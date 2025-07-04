import { ProductDetail } from '@/app/product/[id]/index'; // Import the type from the product page
import { Image } from '@/components/ui/image';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

// Simple Product Card component for related products
export function ProductCardSimple({
  product,
  onPress,
  onAddToCart,
}: {
  product: ProductDetail;
  onPress?: (id: string) => void;
  onAddToCart?: (product: ProductDetail) => void;
}) {
  const [imageLoading, setImageLoading] = useState(true);
  
  // Determine the best image to use with better fallback
  const imageUrl = useMemo(() => {
    if (product.featuredImage) return product.featuredImage;
    if (product.images && product.images.length > 0) return product.images[0];
    return 'https://via.placeholder.com/300?text=Product';
  }, [product.featuredImage, product.images]);
  
  // Memoize handlers for better performance
  const handlePress = useCallback(() => {
    onPress && onPress(product.id);
  }, [product.id, onPress]);
  
  const handleAddToCart = useCallback(() => {
    onAddToCart && onAddToCart(product);
  }, [product, onAddToCart]);
  
  return (
    <TouchableOpacity
      style={styles.relatedProductCard}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.relatedProductImageContainer}>
        <Image
          source={{ uri: imageUrl }}
          alt={product.name}
          style={styles.relatedProductImage}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  relatedProductCard: {
    width: 160,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  relatedProductImageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  relatedProductImage: {
    width: '100%',
    height: '100%',
  },
});
