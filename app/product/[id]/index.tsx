import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Heart, ShoppingBag, Star } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, TouchableOpacity } from 'react-native';

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
  color?: string;
  size?: string;
  status?: string;
  sellerId?: string;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mainImage, setMainImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const { width } = Dimensions.get('window');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
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
          color: productData.color || '',
          size: productData.size || '',
          status: productData.status || '',
          sellerId: productData.sellerId || '',
        };
        
        setProduct(productWithId);
        setMainImage(productWithId.featuredImage);
      } catch (error) {
        console.error('Error fetching product details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProductDetails();
  }, [id]);

  const handleAddToCart = () => {
    // Placeholder for cart functionality
    Alert.alert('Success', `${product?.name} added to cart`);
  };
  
  const handleBuyNow = () => {
    // Placeholder for buy now functionality
    Alert.alert('Coming Soon', 'Buy now functionality is coming soon!');
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (product?.stockQuantity && newQuantity > product.stockQuantity) {
      Alert.alert('Error', 'Cannot exceed available stock');
      return;
    }
    setQuantity(newQuantity);
  };

  if (isLoading) {
    return (
      <Box className="flex-1 justify-center items-center bg-white">
        <Spinner size="large" color="blue" />
        <Text className="mt-4 text-gray-600">Loading product details...</Text>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box className="flex-1 justify-center items-center bg-white">
        <Text className="text-xl font-semibold text-gray-800">Product not found</Text>
        <Button 
          className="mt-6 bg-blue-600" 
          onPress={() => router.back()}
        >
          <ButtonText>Go Back</ButtonText>
        </Button>
      </Box>
    );
  }

  // Calculate discount percentage
  const discountPercentage = product.discountPrice && product.basePrice 
    ? Math.round(((product.basePrice - product.discountPrice) / product.basePrice) * 100)
    : 0;

  return (
    <Box className="flex-1 bg-white">
      {/* Header */}
      <HStack 
        className="w-full bg-white px-4 pt-12 pb-4 items-center justify-between"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
          zIndex: 10,
        }}
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <ArrowLeft size={20} color="#333" />
        </TouchableOpacity>
        
        <Text className="text-lg font-semibold text-gray-800">Product Details</Text>
        
        <TouchableOpacity 
          onPress={() => setIsFavorite(!isFavorite)}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <Heart 
            size={20} 
            color={isFavorite ? "#ff4b4b" : "#333"} 
            fill={isFavorite ? "#ff4b4b" : "none"} 
          />
        </TouchableOpacity>
      </HStack>
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Main Image */}
        <Box className="w-full relative">
          <Image 
            source={{ uri: mainImage || product.featuredImage }}
            alt={product.name}
            className="w-full h-80"
            resizeMode="cover"
          />
          
          {discountPercentage > 0 && (
            <Box className="absolute top-4 left-4 bg-red-500 px-3 py-1 rounded-full">
              <Text className="text-white font-medium text-xs">
                {discountPercentage}% OFF
              </Text>
            </Box>
          )}
        </Box>
        
        {/* Image Gallery */}
        {product.images && product.images.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="py-4 px-2"
          >
            <TouchableOpacity 
              onPress={() => setMainImage(product.featuredImage)}
              className={`mr-3 rounded-md border-2 overflow-hidden ${
                mainImage === product.featuredImage ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <Image 
                source={{ uri: product.featuredImage }}
                className="w-16 h-16"
                resizeMode="cover"
                alt="thumbnail"
              />
            </TouchableOpacity>
            
            {product.images.map((img, index) => (
              <TouchableOpacity 
                key={index}
                onPress={() => setMainImage(img)}
                className={`mr-3 rounded-md border-2 overflow-hidden ${
                  mainImage === img ? 'border-blue-500' : 'border-transparent'
                }`}
              >
                <Image 
                  source={{ uri: img }}
                  className="w-16 h-16"
                  resizeMode="cover"
                  alt="thumbnail"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        
        {/* Product Info */}
        <VStack className="p-4 space-y-4">
          <Text className="text-2xl font-bold text-gray-800">
            {product.name}
          </Text>
          
          <HStack className="items-center space-x-2">
            <HStack className="items-center space-x-1">
              <Star size={16} color="#FFB800" fill="#FFB800" />
              <Star size={16} color="#FFB800" fill="#FFB800" />
              <Star size={16} color="#FFB800" fill="#FFB800" />
              <Star size={16} color="#FFB800" fill="#FFB800" />
              <Star size={16} color="#FFB800" />
            </HStack>
            <Text className="text-gray-600 text-sm">4.0 (24 reviews)</Text>
          </HStack>
          
          <HStack className="items-center space-x-2">
            <Text className="text-2xl font-bold text-gray-900">
              ₹{product.discountPrice || product.basePrice}
            </Text>
            
            {product.discountPrice && (
              <Text className="text-lg text-gray-400 line-through">
                ₹{product.basePrice}
              </Text>
            )}
          </HStack>
          
          {product.brand && (
            <HStack className="items-center space-x-2">
              <Text className="text-gray-500">Brand:</Text>
              <Text className="text-gray-800 font-medium">{product.brand}</Text>
            </HStack>
          )}
          
          {product.categoryName && (
            <HStack className="items-center space-x-2">
              <Text className="text-gray-500">Category:</Text>
              <Text className="text-gray-800 font-medium">{product.categoryName}</Text>
            </HStack>
          )}
          
          {/* Stock Status */}
          <HStack className="items-center space-x-2">
            <Text className="text-gray-500">Availability:</Text>
            {product.stockQuantity > 0 ? (
              <Text className="text-green-600 font-medium">In Stock ({product.stockQuantity} items)</Text>
            ) : (
              <Text className="text-red-600 font-medium">Out of Stock</Text>
            )}
          </HStack>
          
          {/* Quantity Selector */}
          <VStack className="mt-4 space-y-2">
            <Text className="text-gray-800 font-medium">Quantity:</Text>
            <HStack className="items-center space-x-4">
              <TouchableOpacity
                onPress={() => handleQuantityChange(quantity - 1)}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                disabled={quantity <= 1}
              >
                <Text className="text-2xl font-semibold text-gray-600">-</Text>
              </TouchableOpacity>
              
              <Text className="text-lg font-semibold text-gray-800">{quantity}</Text>
              
              <TouchableOpacity
                onPress={() => handleQuantityChange(quantity + 1)}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
              >
                <Text className="text-2xl font-semibold text-gray-600">+</Text>
              </TouchableOpacity>
            </HStack>
          </VStack>
          
          {/* Description */}
          <VStack className="mt-4 space-y-2">
            <Text className="text-xl font-semibold text-gray-800">Description</Text>
            <Text className="text-gray-600 leading-6">{product.description}</Text>
          </VStack>
        </VStack>
      </ScrollView>
      
      {/* Bottom Action Buttons */}
      <HStack 
        className="w-full bg-white px-4 py-4 items-center justify-between border-t border-gray-200"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        }}
      >
        <Button
          variant="outline"
          className="flex-1 mr-3 border-blue-500"
          onPress={handleAddToCart}
          disabled={product.stockQuantity <= 0}
        >
          <ShoppingBag size={20} color="#3B82F6" className="mr-2" />
          <ButtonText className="text-blue-500">Add to Cart</ButtonText>
        </Button>
        
        <Button
          className="flex-1 bg-blue-600"
          onPress={handleBuyNow}
          disabled={product.stockQuantity <= 0}
        >
          <ButtonText>Buy Now</ButtonText>
        </Button>
      </HStack>
    </Box>
  );
}