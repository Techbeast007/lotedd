'use client';

import { categories } from '@/assets/categories';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { Filter, Search, ShoppingBag, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, FlatList, Image, StatusBar, StyleSheet, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.44;

// Sample products data
const products = [
  {
    id: 1,
    name: 'Fresh Tomatoes',
    price: 40,
    quantity: '1 kg',
    image: 'https://images.unsplash.com/photo-1561136594-7f68413baa99?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    rating: 4.5,
    seller: 'Organic Farms'
  },
  {
    id: 2,
    name: 'Fresh Spinach',
    price: 30,
    quantity: '500 g',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    rating: 4.3,
    seller: 'Green Farms'
  },
  {
    id: 3,
    name: 'Red Apples',
    price: 150,
    quantity: '1 kg',
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    rating: 4.7,
    seller: 'Hill Orchards'
  },
  {
    id: 4,
    name: 'Organic Carrots',
    price: 60,
    quantity: '1 kg',
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5d4f7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    rating: 4.2,
    seller: 'Organic Farms'
  },
  {
    id: 5,
    name: 'Fresh Potatoes',
    price: 50,
    quantity: '2 kg',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    rating: 4.1,
    seller: 'Local Farms'
  },
  {
    id: 6,
    name: 'Organic Onions',
    price: 35,
    quantity: '1 kg',
    image: 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    rating: 4.0,
    seller: 'Organic Farms'
  },
  {
    id: 7,
    name: 'Fresh Cucumbers',
    price: 25,
    quantity: '500 g',
    image: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    rating: 4.4,
    seller: 'Green Farms'
  },
  {
    id: 8,
    name: 'Fresh Okra',
    price: 45,
    quantity: '500 g',
    image: 'https://images.unsplash.com/photo-1626920369171-b8f3766a2b49?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    rating: 4.2,
    seller: 'Local Farms'
  }
];

export default function ShopScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const filteredProducts = products.filter(product => {
    return product.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderCategoryButton = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.categoryButton,
        selectedCategory === item.id ? styles.categoryButtonActive : {}
      ]}
      onPress={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
    >
      <Text 
        style={[
          styles.categoryButtonText,
          selectedCategory === item.id ? styles.categoryButtonTextActive : {}
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProductCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => router.push(`/product/${item.id}`)}
    >
      <Box style={styles.productImageContainer}>
        <Image 
          source={{ uri: item.image }} 
          style={styles.productImage}
        />
      </Box>
      <Box style={styles.productInfo}>
        <Text style={styles.productSeller}>{item.seller}</Text>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productQuantity}>{item.quantity}</Text>
        <HStack style={styles.productPriceRow}>
          <Text style={styles.productPrice}>₹{item.price}</Text>
          <TouchableOpacity style={styles.addButton}>
            <ShoppingBag size={16} color="#FFF" />
          </TouchableOpacity>
        </HStack>
      </Box>
    </TouchableOpacity>
  );

  return (
    <Box style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <Box style={styles.header}>
        <HStack style={styles.searchContainer}>
          <Input style={styles.searchInput} size="md">
            <InputSlot pl="$3">
              <InputIcon>
                <Search size={20} color="#9CA3AF" />
              </InputIcon>
            </InputSlot>
            <InputField
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <InputSlot pr="$3">
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </InputSlot>
            ) : null}
          </Input>
          
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color="#1F2937" />
          </TouchableOpacity>
        </HStack>
      </Box>
      
      {/* Category Selector */}
      <Box style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={[{id: 'all', name: 'All'}, ...categories]}
          renderItem={renderCategoryButton}
          keyExtractor={item => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </Box>
      
      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productList}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderColor: 'transparent',
    marginRight: 12,
  },
  filterButton: {
    backgroundColor: '#F3F4F6',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#3B82F6',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  productList: {
    paddingHorizontal: 16,
    paddingBottom: 90,
    paddingTop: 16,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productImageContainer: {
    height: CARD_WIDTH,
    width: '100%',
  },
  productImage: {
    height: '100%',
    width: '100%',
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 12,
  },
  productSeller: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});