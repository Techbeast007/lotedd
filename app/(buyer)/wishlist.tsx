import { Button, ButtonText } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { getCurrentUser } from '@/services/authService';
import { useCart } from '@/services/context/CartContext';
import { Product } from '@/services/productService';
import { getUserWishlist, removeFromWishlist, WishlistItem } from '@/services/wishlistService';
import { Link, useRouter } from 'expo-router';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function WishlistScreen() {
  const router = useRouter();
  const toast = useToast();
  const { addItem } = useCart();
  const currentUser = getCurrentUser();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlistItems = React.useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const items = await getUserWishlist(currentUser.uid);
      setWishlistItems(items);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to load your wishlist</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, toast]);
  
  useEffect(() => {
    if (!currentUser) {
      router.push('/(auth)');
      return;
    }
    
    fetchWishlistItems();
  }, [currentUser, router, fetchWishlistItems]);

  const handleRemoveItem = async (productId: string) => {
    if (!currentUser) return;
    
    try {
      await removeFromWishlist(currentUser.uid, productId);
      setWishlistItems(prev => prev.filter(item => item.productId !== productId));
      
      toast.show({
        render: () => (
          <Toast action="success" variant="solid">
            <VStack space="xs">
              <ToastTitle>Item Removed</ToastTitle>
              <ToastDescription>Product removed from your wishlist</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    } catch (error) {
      console.error('Error removing item from wishlist:', error);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to remove item</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    // Create a product object that matches the Product interface
    const product: Product = {
      id: item.productId,
      name: item.name,
      basePrice: item.basePrice,
      discountPrice: item.discountPrice,
      description: '',  // Required field in Product interface
      stockQuantity: 1, // Required field in Product interface
      featuredImage: item.featuredImage,
      images: item.featuredImage ? [item.featuredImage] : []
    };
    
    addItem(product, 1);
    
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
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWishlistItems();
  };

  // Empty wishlist view
  const EmptyWishlist = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Heart size={80} color="#cccccc" />
      <Heading size="lg" style={{ marginTop: 16, marginBottom: 8, textAlign: 'center' }}>Your wishlist is empty</Heading>
      <Text style={{ textAlign: 'center', color: '#a3a3a3', marginBottom: 16 }}>
        Items you save to your wishlist will appear here
      </Text>
      <Button variant="solid" size="lg" onPress={() => router.push('/(buyer)/home')}>
        <ButtonText>Explore Products</ButtonText>
      </Button>
    </View>
  );

  // Wishlist item component
  const WishlistItem = ({ item }: { item: WishlistItem }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <TouchableOpacity 
          onPress={() => router.push(`/product/${item.productId}`)}
          style={styles.imageContainer}
        >
          <Image 
            source={{ uri: item.featuredImage || 'https://via.placeholder.com/100' }} 
            alt={item.name}
            style={styles.productImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
        
        <View style={styles.productDetails}>
          <Link href={`/product/${item.productId}`} asChild>
            <TouchableOpacity>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              {item.brand && <Text style={styles.brandText}>{item.brand}</Text>}
            </TouchableOpacity>
          </Link>
          
          <View style={styles.productActions}>
            <View>
              {item.discountPrice ? (
                <>
                  <Text style={styles.salePrice}>${item.discountPrice.toFixed(2)}</Text>
                  <Text style={styles.regularPrice}>
                    ${item.basePrice.toFixed(2)}
                  </Text>
                </>
              ) : (
                <Text style={styles.salePrice}>${item.basePrice.toFixed(2)}</Text>
              )}
            </View>
            
            <View style={styles.actionButtons}>
              <Button 
                variant="outline" 
                size="sm"
                onPress={() => handleRemoveItem(item.productId)}
                style={styles.removeButton}
              >
                <Trash2 size={16} color="#ef4444" />
              </Button>
              
              <Button 
                variant="solid" 
                size="sm"
                onPress={() => handleAddToCart(item)}
                style={styles.addToCartButton}
              >
                <ShoppingBag size={16} color="#FFFFFF" />
              </Button>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Heading size="lg">My Wishlist</Heading>
          <Heart size={24} color="#0891b2" fill="#0891b2" />
        </View>
        
        <Divider />
        
        <FlatList
          data={wishlistItems}
          renderItem={({ item }) => <WishlistItem item={item} />}
          keyExtractor={item => item.productId}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={EmptyWishlist}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          style={{ paddingHorizontal: 16 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  brandText: {
    fontSize: 12,
    color: '#a3a3a3',
    marginBottom: 8,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  salePrice: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#0891b2',
  },
  regularPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    color: '#a3a3a3',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  removeButton: {
    borderColor: '#ef4444',
  },
  addToCartButton: {
    backgroundColor: '#0891b2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
});
