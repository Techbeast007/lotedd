import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Product, getProductsByCategory } from '@/services/productService';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import ProductCard from './ProductCard';

interface CategoryProductCarouselProps {
  categoryId: string;
  categoryName: string;
  limit?: number;
}

export const CategoryProductCarousel: React.FC<CategoryProductCarouselProps> = ({ 
  categoryId, 
  categoryName,
  limit = 10 
}) => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const categoryProducts = await getProductsByCategory(categoryId, limit);
        setProducts(categoryProducts);
      } catch (err) {
        console.error(`Error fetching products for category ${categoryId}:`, err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryId]);

  // If no products are available for this category, don't render anything
  if (products.length === 0 && !loading) {
    return null;
  }

  return (
    <Box style={styles.container}>
      <HStack style={styles.header}>
        <Heading size="sm" style={styles.title}>{categoryName}</Heading>
        <TouchableOpacity onPress={() => router.push(`/category/${categoryId}`)}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </HStack>

      {loading ? (
        <Box style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </Box>
      ) : error ? (
        <Box style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </Box>
      ) : (
        <FlatList
          horizontal
          data={products}
          renderItem={({ item }) => <ProductCard product={item} />}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productList}
        />
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  seeAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  productList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
});

export default CategoryProductCarousel;