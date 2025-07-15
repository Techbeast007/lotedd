'use client';

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { Divider } from '@/components/ui/divider';
import { FormControl, FormControlLabel } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Input } from '@/components/ui/input';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader
} from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
// Using custom date time picker implementation
import { useRouter } from 'expo-router';
import { Activity, Calendar, Gavel, MessageCircle, Package, Plus, Search, ShoppingBag, Trash2, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentUser } from '@/services/authService';
import { Bid, BidOffer, BidStatus, createBid, deleteBid, getBidOffersByBidId, getBids, updateBidOfferStatus } from '@/services/biddingService';
import { useChatContext } from '@/services/context/ChatContext';
import { Product, getPopularProducts, getProductsByOwnerId } from '@/services/productService';


export default function ManageBidsScreen() {
  const router = useRouter();
  const toast = useToast();
  const currentUser = getCurrentUser();
  const { unreadCount } = useChatContext();
  
  // State management
  const [bids, setBids] = useState<Bid[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'ended' | 'create'>('active');
  
  // Modal state
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bidOffers, setBidOffers] = useState<BidOffer[]>([]);
  
  // New bid form state
  const [basePrice, setBasePrice] = useState('');
  const [moq, setMoq] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Product selection modal state
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'price'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 5; // Number of products to show per page
  
  // Date picker modal state
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [tempDate, setTempDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('PM');
  
  // Load all required data - use useRef to track loading state to avoid render loops
  const isCurrentlyLoading = React.useRef(false);
  
  const loadData = useCallback(async () => {
    // Guard against concurrent loading and missing user
    if (!currentUser || isCurrentlyLoading.current) return;
    
    try {
      isCurrentlyLoading.current = true;
      setIsLoading(true);
      
      // Get seller's bids
      const sellerBids = await getBids({ sellerId: currentUser.uid });
      setBids(sellerBids);
      
      // Get seller's products with complete data including view counts
      const products = await getProductsByOwnerId(currentUser.uid);
      
      if (products && Array.isArray(products)) {
        // Early exit if products array is empty
        if (products.length === 0) {
          setMyProducts([]);
        } else {
          // Sort by recently added by default
          const sortedProducts = [...products].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
            return dateB.getTime() - dateA.getTime();
          });
          
          // Set products directly
          setMyProducts(sortedProducts);
          
          // Reset to first page when data is refreshed - moved outside the setMyProducts to avoid nested state updates
          setCurrentPage(1);
        }
      } else {
        console.error('getProductsByOwnerId returned invalid data');
      }
      
      // Get popular products for recommendations
      const popular = await getPopularProducts(10);
      if (popular && Array.isArray(popular)) {
        setPopularProducts(popular);
      }
      
      // Clear any previous errors on successful load
      setError(null);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Could not load data. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      isCurrentlyLoading.current = false;
    }
  }, [currentUser]); // currentUser is the only dependency we need      // Initial data loading
  useEffect(() => {
    if (!currentUser) {
      setError('You must be logged in to manage bids');
      setIsLoading(false);
      return;
    }
    
    // Log user ID for debugging
    console.log('Current user ID for product fetching:', currentUser.uid);
    
    // Load data once on component mount
    loadData();
    
    // No interval refresh - load data only on mount or manual refresh
  }, [currentUser, loadData]);
  
  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);
  
  // Handle bid card press - view details and offers
  const handleBidPress = useCallback(async (bid: Bid) => {
    try {
      setSelectedBid(bid);
      
      // Fetch bid offers
      const offers = await getBidOffersByBidId(bid.id!);
      setBidOffers(offers);
      
      // Show modal
      setBidModalVisible(true);
    } catch (err) {
      console.error('Failed to fetch bid offers:', err);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to load bid offers</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    }
  }, [toast]);
  
  // Handle delete bid
  const handleDeleteBid = useCallback(async (bid: Bid) => {
    Alert.alert(
      'Delete Bid',
      'Are you sure you want to delete this bid?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBid(bid.id!);
              
              // Update bids list
              setBids(prevBids => prevBids.filter(b => b.id !== bid.id));
              
              toast.show({
                render: () => (
                  <Toast action="success" variant="solid">
                    <VStack space="xs">
                      <ToastTitle>Success</ToastTitle>
                      <ToastDescription>Bid deleted successfully</ToastDescription>
                    </VStack>
                  </Toast>
                )
              });
            } catch (err) {
              console.error('Failed to delete bid:', err);
              toast.show({
                render: () => (
                  <Toast action="error" variant="solid">
                    <VStack space="xs">
                      <ToastTitle>Error</ToastTitle>
                      <ToastDescription>Failed to delete bid</ToastDescription>
                    </VStack>
                  </Toast>
                )
              });
            }
          }
        }
      ]
    );
  }, [toast]);
  
  // Handle update bid offer status
  const handleUpdateOfferStatus = useCallback(async (offerId: string, status: BidOffer['status']) => {
    try {
      await updateBidOfferStatus(offerId, status);
      
      // Update bid offers list
      setBidOffers(prevOffers => 
        prevOffers.map(offer => 
          offer.id === offerId ? { ...offer, status } : offer
        )
      );
      
      toast.show({
        render: () => (
          <Toast action="success" variant="solid">
            <VStack space="xs">
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>
                Bid offer {status === 'accepted' ? 'accepted' : 
                  status === 'rejected' ? 'rejected' : 'updated'}
              </ToastDescription>
            </VStack>
          </Toast>
        )
      });
    } catch (err) {
      console.error('Failed to update bid offer:', err);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to update bid offer</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    }
  }, [toast]);
  
  // Handle create bid
  const handleCreateBid = useCallback(async () => {
    // Use selectedProduct for consistency with the rest of the code
    if (!selectedProduct || !currentUser) {
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Please select a product</ToastDescription>
            </VStack>
          </Toast>
        )
      });
      return;
    }
    
    const basePriceNum = parseFloat(basePrice);
    const moqNum = parseInt(moq, 10);
    
    // Validate input
    if (isNaN(basePriceNum) || basePriceNum <= 0) {
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Invalid Price</ToastTitle>
              <ToastDescription>Please enter a valid base price</ToastDescription>
            </VStack>
          </Toast>
        )
      });
      return;
    }
    
    if (isNaN(moqNum) || moqNum <= 0) {
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Invalid Quantity</ToastTitle>
              <ToastDescription>Please enter a valid minimum order quantity</ToastDescription>
            </VStack>
          </Toast>
        )
      });
      return;
    }
    
    // Validate MOQ against stock quantity
    if (selectedProduct && moqNum > selectedProduct.stockQuantity) {
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Invalid Quantity</ToastTitle>
              <ToastDescription>Minimum order quantity cannot exceed available stock ({selectedProduct.stockQuantity} units)</ToastDescription>
            </VStack>
          </Toast>
        )
      });
      return;
    }
    
    // Validate end date
    if (endDate <= new Date()) {
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Invalid Date</ToastTitle>
              <ToastDescription>End date must be in the future</ToastDescription>
            </VStack>
          </Toast>
        )
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Save these values to local variables to prevent race conditions
      const bidData = {
        productId: selectedProduct.id!,
        sellerId: currentUser.uid,
        basePrice: basePriceNum,
        moq: moqNum,
        bidEndTime: endDate,
        status: 'open' as BidStatus, // Fix type with explicit cast
        description,
        productDetails: selectedProduct,
      };
      
      await createBid(bidData);
      
      // Reset form - move all state updates into a single function to batch them
      const resetForm = () => {
        // Reset all form fields at once
        setSelectedProduct(null);
        setBasePrice('');
        setMoq('');
        setDescription('');
        setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      };
      
      // Use setTimeout to ensure state updates don't cause render loop
      setTimeout(() => {
        resetForm();
        
        toast.show({
          render: () => (
            <Toast action="success" variant="solid">
              <VStack space="xs">
                <ToastTitle>Success</ToastTitle>
                <ToastDescription>Bid created successfully</ToastDescription>
              </VStack>
            </Toast>
          )
        });
        
        // Refresh data and change tab
        loadData();
        setActiveTab('active');
      }, 10);
      
    } catch (err) {
      console.error('Failed to create bid:', err);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to create bid. Please try again.</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedProduct, currentUser, basePrice, moq, description, endDate, toast, loadData]);
  
  // Date picker is now handled by the DateTimePickerModal component directly
  
  // Handle select product for bid
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setBasePrice(product.basePrice.toString());
    setMoq('1'); // Default MOQ
    setProductModalVisible(false);
  };
  
  // Filter and sort products for the modal with stabilized dependencies
  const filteredAndSortedProducts = useMemo(() => {
    // Skip calculation if products array is empty
    if (!myProducts.length) {
      return [];
    }
    
    // Create a local copy to avoid mutating the original array
    let filtered = [...myProducts];
    
    // Apply search filter if query exists
    if (productSearchQuery.trim()) {
      const query = productSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        product => 
          (product.name || '').toLowerCase().includes(query) || 
          (product.brand || '').toLowerCase().includes(query) ||
          (product.description || '').toLowerCase().includes(query)
      );
    }
    
    // Apply sorting - create a new array to avoid mutation
    return [...filtered].sort((a, b) => {
      if (sortBy === 'popular') {
        return (b.viewCount || 0) - (a.viewCount || 0);
      } else if (sortBy === 'price') {
        return (a.basePrice || 0) - (b.basePrice || 0);
      } else {
        // 'recent' - default sort
        const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      }
    });
  }, [myProducts, productSearchQuery, sortBy]);
  
  // Calculate total pages - simple calculation, doesn't need to recreate arrays
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAndSortedProducts.length / productsPerPage));
  }, [filteredAndSortedProducts.length, productsPerPage]);
  
  // Get paginated products - memoize to avoid recalculation
  const paginatedProducts = useMemo(() => {
    // Skip work if the list is empty
    if (filteredAndSortedProducts.length === 0) {
      return [];
    }
    
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    
    // Apply pagination - slice creates a new array, no mutation
    return filteredAndSortedProducts.slice(startIndex, endIndex);
  }, [filteredAndSortedProducts, currentPage, productsPerPage]);
  
  // Filter bids based on active tab
  const filteredBids = bids.filter(bid => {
    const isEnded = bid.bidEndTime && new Date(bid.bidEndTime.seconds * 1000) < new Date();
    return activeTab === 'active' ? !isEnded : isEnded;
  });
  
  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.seconds ? 
      new Date(timestamp.seconds * 1000) : 
      new Date(timestamp);
      
    return date.toLocaleDateString('en-US', {
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Loading state
  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading bids...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Activity size={60} color="#9CA3AF" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          size="md"
          variant="solid"
          style={styles.retryButton}
          onPress={loadData}
          className="mb-3"
        >
          <ButtonText>Try Again</ButtonText>
        </Button>
        <Button 
          size="md"
          variant="outline"
          onPress={() => router.push('/productadd')}
          className="mb-3"
        >
          <ButtonText>Add New Product</ButtonText>
        </Button>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Heading size="xl" style={styles.headerTitle}>Manage Bids</Heading>
          <Text style={styles.headerSubtitle}>Create and manage your product bids</Text>
        </View>
        <TouchableOpacity 
          style={styles.messagesButton}
          onPress={() => {
            // Use replace instead of push to prevent stack navigation issues
            router.replace('/messages');
          }}
        >
          <MessageCircle size={24} color="#0F172A" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'active' && styles.activeTabText
          ]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ended' && styles.activeTab]}
          onPress={() => setActiveTab('ended')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'ended' && styles.activeTabText
          ]}>
            Ended
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.activeTab]}
          onPress={() => setActiveTab('create')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'create' && styles.activeTabText
          ]}>
            Create
          </Text>
        </TouchableOpacity>
      </View>
      {/* Content based on active tab */}
      {activeTab === 'create' ? (
        <FlatList
          data={popularProducts.length > 0 ? popularProducts : [{ id: 'dummy-for-scroll', name: '', brand: '', basePrice: 0, description: '', stockQuantity: 0 }]}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={({ item }) => (
            item.id !== 'dummy-for-scroll' ? (
              <Card key={item.id} className="p-3 rounded-xl mb-3">
                <HStack className="items-center">
                  <Box className="w-[60px] h-[60px] bg-slate-100 rounded-lg overflow-hidden mr-3">
                    {item?.featuredImage ? (
                      <Image
                        source={{ uri: item.featuredImage }}
                        alt={item.name || 'Product'}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Box className="w-full h-full items-center justify-center bg-slate-200">
                        <Package size={24} color="#94A3B8" />
                      </Box>
                    )}
                  </Box>
                  <VStack className="flex-1">
                    <Text className="text-sm text-slate-500">{item.brand || 'No Brand'}</Text>
                    <Text className="text-base font-medium text-slate-800 mb-1">{item.name}</Text>
                    <HStack className="items-center">
                      <Text className="text-xs text-slate-500 mr-2">{item.viewCount || 0} views</Text>
                      <Text className="text-xs text-slate-500">₹{item.basePrice}</Text>
                    </HStack>
                  </VStack>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onPress={() => handleSelectProduct(item)}
                  >
                    <ButtonText>Select</ButtonText>
                  </Button>
                </HStack>
              </Card>
            ) : null
          )}
          ListHeaderComponent={
            <View>
              <Card className="p-4 rounded-xl mb-4">
                <Text className="text-base font-semibold text-slate-800 mb-4">Create a New Bid</Text>
                {/* Product Selection */}
                <Text className="text-sm font-medium text-slate-700 mb-2">Select a Product</Text>
                {selectedProduct ? (
                  <TouchableOpacity
                    className="flex-row items-center bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200"
                    onPress={() => setProductModalVisible(true)}
                  >
                    <Box className="w-[60px] h-[60px] bg-slate-100 rounded-lg overflow-hidden mr-3">
                      {selectedProduct?.featuredImage ? (
                        <Image
                          source={{ uri: selectedProduct.featuredImage }}
                          alt={selectedProduct.name || 'Product'}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Box className="w-full h-full items-center justify-center bg-slate-200">
                          <Package size={24} color="#94A3B8" />
                        </Box>
                      )}
                    </Box>
                    <VStack className="flex-1">
                      <Text className="text-sm text-slate-500">{selectedProduct.brand || 'No Brand'}</Text>
                      <Text className="text-base font-medium text-slate-800">{selectedProduct.name}</Text>
                      <Text className="text-sm text-slate-600">₹{selectedProduct.basePrice} • Stock: {selectedProduct.stockQuantity}</Text>
                    </VStack>
                    <Button
                      variant="outline"
                      size="xs"
                      className="ml-2"
                      onPress={() => setProductModalVisible(true)}
                    >
                      <ButtonText>Change</ButtonText>
                    </Button>
                  </TouchableOpacity>
                ) : (
                  <Button
                    variant="outline"
                    className="mb-4"
                    onPress={() => setProductModalVisible(true)}
                  >
                    <HStack className="items-center">
                      <Plus size={18} color="#475569" />
                      <Text className="text-slate-700 ml-2">Select Product</Text>
                    </HStack>
                  </Button>
                )}
                {/* Base Price */}
                <FormControl className="mb-4">
                  <FormControlLabel>
                    <Text className="text-sm font-medium text-slate-700">Base Price (₹)</Text>
                  </FormControlLabel>
                  <Input>
                    <TextInput
                      value={basePrice}
                      onChangeText={setBasePrice}
                      keyboardType="numeric"
                      placeholder="Enter base price"
                      style={styles.input}
                    />
                  </Input>
                </FormControl>
                {/* MOQ */}
                <FormControl className="mb-4">
                  <FormControlLabel>
                    <Text className="text-sm font-medium text-slate-700">Minimum Order Quantity</Text>
                  </FormControlLabel>
                  <Input>
                    <TextInput
                      value={moq}
                      onChangeText={setMoq}
                      keyboardType="numeric"
                      placeholder="Enter minimum quantity"
                      style={styles.input}
                    />
                  </Input>
                </FormControl>
                {/* End Date */}
                <FormControl className="mb-4">
                  <FormControlLabel>
                    <Text className="text-sm font-medium text-slate-700">Bid End Date</Text>
                  </FormControlLabel>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => {
                      // Initialize temp date with current selected date
                      setTempDate(new Date(endDate));
                      
                      // Set hour, minute and AM/PM based on current selected date
                      const hours = endDate.getHours();
                      const minutes = endDate.getMinutes();
                      setSelectedHour(hours % 12 || 12);
                      setSelectedMinute(minutes);
                      setSelectedAmPm(hours >= 12 ? 'PM' : 'AM');
                      
                      // Show date picker modal
                      setDatePickerVisible(true);
                    }}
                  >
                    <Text style={styles.datePickerText}>{endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                    <Calendar size={20} color="#64748B" />
                  </TouchableOpacity>
                </FormControl>
                {/* Description */}
                <FormControl className="mb-4">
                  <FormControlLabel>
                    <Text className="text-sm font-medium text-slate-700">Description (Optional)</Text>
                  </FormControlLabel>
                  <Input>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Enter bid description"
                      multiline
                      numberOfLines={4}
                      style={[styles.input, styles.textArea]}
                    />
                  </Input>
                </FormControl>
                {/* Submit Button */}
                <Button
                  variant="solid"
                  className="mt-2"
                  isDisabled={isSubmitting || !selectedProduct}
                  onPress={handleCreateBid}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ButtonText>Create Bid</ButtonText>
                  )}
                </Button>
              </Card>
            </View>
          }
          ListFooterComponent={
            popularProducts.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Heading size="sm">Popular Products</Heading>
                <Text style={styles.sectionSubtitle}>These popular products are good candidates for bidding</Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.createFormContainer}
          showsVerticalScrollIndicator={true}
        />
      ) : (
        <FlatList
          data={filteredBids}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <Card className="p-4 rounded-xl mb-4">
              <HStack className="items-center mb-3">
                <Box className="w-[70px] h-[70px] bg-slate-100 rounded-lg overflow-hidden mr-3">
                  {item.productDetails?.featuredImage ? (
                    <Image
                      source={{ uri: item.productDetails.featuredImage }}
                      alt={item.productDetails.name || "Product"}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Box className="w-full h-full items-center justify-center bg-slate-200">
                      <Package size={24} color="#94A3B8" />
                    </Box>
                  )}
                </Box>
                
                <VStack className="flex-1">
                  <Text className="text-sm text-slate-500">
                    {item.productDetails?.brand || 'No Brand'}
                  </Text>
                  
                  <Text className="text-base font-semibold text-slate-800 mb-1">
                    {item.productDetails?.name || 'Product'}
                  </Text>
                  
                  <HStack className="items-center">
                    <Text className="text-xs text-slate-500 mr-3">
                      Base: ₹{item.basePrice}
                    </Text>
                    
                    <Text className="text-xs text-slate-500 mr-3">
                      MOQ: {item.moq}
                    </Text>
                    
                    <Box 
                      className={`py-1 px-2 rounded-full ${
                        item.bidEndTime && new Date(item.bidEndTime.seconds * 1000) < new Date() ?
                        'bg-red-100' : 'bg-green-100'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-medium ${
                          item.bidEndTime && new Date(item.bidEndTime.seconds * 1000) < new Date() ?
                          'text-red-800' : 'text-green-800'
                        }`}
                      >
                        {item.bidEndTime && new Date(item.bidEndTime.seconds * 1000) < new Date() ? 
                          'ENDED' : 'ACTIVE'}
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteBid(item)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </HStack>
              
              <Divider className="my-3" />
              
              <HStack className="items-center justify-between">
                <VStack>
                  <Text className="text-xs text-slate-500">End Date</Text>
                  <Text className="text-sm font-medium text-slate-700">
                    {formatDate(item.bidEndTime)}
                  </Text>
                </VStack>
                
                <VStack>
                  <Text className="text-xs text-slate-500">Bids Received</Text>
                  <Text className="text-sm font-medium text-slate-700">
                    {item.bidCount || 0}
                  </Text>
                </VStack>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-300"
                  onPress={() => handleBidPress(item)}
                >
                  <ButtonText className="text-indigo-700">View Offers</ButtonText>
                </Button>
              </HStack>
            </Card>
          )}
          contentContainerStyle={styles.bidsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Gavel size={60} color="#D1D5DB" />
              <Heading size="md" style={styles.emptyStateTitle}>
                {activeTab === 'active' ? 'No active bids' : 'No ended bids'}
              </Heading>
              <Text style={styles.emptyStateText}>
                {activeTab === 'active' 
                  ? 'You have no active bids. Create one to get started!'
                  : 'You have no ended bids yet.'
                }
              </Text>
              
              {activeTab === 'active' && (
                <Button
                  size="md"
                  variant="solid"
                  style={styles.createButton}
                  onPress={() => setActiveTab('create')}
                >
                  <ButtonText>Create a Bid</ButtonText>
                </Button>
              )}
            </View>
          }
        />
      )}
      {/* Bid Offers Modal */}
      <Modal
        isOpen={bidModalVisible}
        onClose={() => setBidModalVisible(false)}
      >
        <ModalBackdrop />
        <ModalContent className="w-[90%] max-w-[400px]">
            <ModalHeader>
              <Heading size="md">Bid Offers</Heading>
              <ModalCloseButton />
            </ModalHeader>
            
            <ModalBody>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                className="mb-4"
              >
                {/* Product Info */}
                {selectedBid && (
                  <HStack className="items-center mb-4">
                    <Box className="w-[60px] h-[60px] bg-slate-100 rounded-lg overflow-hidden mr-3">
                      {selectedBid.productDetails?.featuredImage ? (
                        <Image
                          source={{ uri: selectedBid.productDetails.featuredImage }}
                          alt={selectedBid.productDetails.name || "Product"}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Box className="w-full h-full items-center justify-center bg-slate-200">
                          <Package size={24} color="#94A3B8" />
                        </Box>
                      )}
                    </Box>
                    
                    <VStack className="flex-1">
                      <Text className="text-sm text-slate-500">
                        {selectedBid.productDetails?.brand || 'No Brand'}
                      </Text>
                      
                      <Text className="text-base font-semibold text-slate-800 mb-1">
                        {selectedBid.productDetails?.name || 'Product'}
                      </Text>
                      
                      <HStack className="items-center">
                        <Text className="text-xs text-slate-500 mr-2">
                          Base: ₹{selectedBid.basePrice}
                        </Text>
                        
                        <Text className="text-xs text-slate-500">
                          MOQ: {selectedBid.moq}
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>
                )}
                
                {/* Bid Offers */}
                {/* Debug info logged when rendering */}
                {bidOffers.length > 0 ? (
                  bidOffers.map((offer, index) => (
                    <Card key={index} className="p-4 rounded-xl mb-3">
                      <HStack className="items-center justify-between">
                        <HStack className="items-center">
                          <Box className="w-[40px] h-[40px] rounded-full bg-slate-100 items-center justify-center mr-3">
                            <User size={20} color="#64748B" />
                          </Box>
                          
                          <VStack>
                            <Text className="text-sm font-medium text-slate-800">
                              {offer.buyerName || `User ${offer.buyerId?.substring(0, 6)}...`}
                            </Text>
                            <Text className="text-xs text-slate-500">
                              {formatDate(offer.createdAt)}
                            </Text>
                          </VStack>
                        </HStack>
                        
                        <Box 
                          className={`py-1 px-2 rounded-full ${
                            offer.status === 'accepted' ? 'bg-green-100' :
                            offer.status === 'rejected' ? 'bg-red-100' :
                            offer.status === 'counteroffered' ? 'bg-amber-100' : 'bg-blue-100'
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              offer.status === 'accepted' ? 'text-green-800' :
                              offer.status === 'rejected' ? 'text-red-800' :
                              offer.status === 'counteroffered' ? 'text-amber-800' : 'text-blue-800'
                            }`}
                          >
                            {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                          </Text>
                        </Box>
                      </HStack>
                      
                      <Divider className="my-3" />
                      
                      <HStack className="items-center justify-between">
                        <VStack>
                          <Text className="text-xs text-slate-500">Bid Amount</Text>
                          <Text className="text-base font-semibold text-slate-900">
                            ₹{offer.bidAmount}
                          </Text>
                        </VStack>
                        
                        <VStack>
                          <Text className="text-xs text-slate-500">Quantity</Text>
                          <Text className="text-base font-semibold text-slate-900">
                            {offer.quantity} units
                          </Text>
                        </VStack>
                        
                        <VStack>
                          <Text className="text-xs text-slate-500">Total Value</Text>
                          <Text className="text-base font-semibold text-slate-900">
                            ₹{(offer.bidAmount * offer.quantity).toLocaleString()}
                          </Text>
                        </VStack>
                      </HStack>
                      
                      {offer.message && (
                        <Box className="mt-3 p-3 bg-slate-50 rounded-lg">
                          <Text className="text-sm text-slate-600">{offer.message}</Text>
                        </Box>
                      )}
                      
                      {offer.status === 'pending' && (
                        <HStack className="mt-4 justify-between">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 mr-2 border-red-300"
                            onPress={() => handleUpdateOfferStatus(offer.id!, 'rejected')}
                          >
                            <ButtonText className="text-red-700">Reject</ButtonText>
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="solid"
                            className="flex-1 ml-2 bg-green-600"
                            onPress={() => handleUpdateOfferStatus(offer.id!, 'accepted')}
                          >
                            <ButtonText>Accept</ButtonText>
                          </Button>
                        </HStack>
                      )}
                    </Card>
                  ))
                ) : (
                  <Box className="items-center justify-center py-10">
                    <ShoppingBag size={40} color="#D1D5DB" />
                    <Text className="mt-4 text-slate-500 text-center">
                      No offers have been placed yet
                    </Text>
                  </Box>
                )}
              </ScrollView>
            </ModalBody>
            
            <ModalFooter>
              <Button
                variant="outline"
                onPress={() => setBidModalVisible(false)}
              >
                <ButtonText>Close</ButtonText>
              </Button>
            </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Product Selection Modal */}
      <Modal
        isOpen={productModalVisible}
        onClose={() => setProductModalVisible(false)}
      >
        <ModalBackdrop />
        <ModalContent className="w-[95%] max-w-[480px] max-h-[80%]">
          <ModalHeader>
            <Heading size="md">Select a Product</Heading>
            <ModalCloseButton />
          </ModalHeader>

          <ModalBody>
            {/* Debug indicator to show if products are loaded */}
            {myProducts.length > 0 && (
              <Text className="text-xs text-green-500 mb-1 text-center">
                {myProducts.length} products available, showing page {currentPage} of {totalPages}
              </Text>
            )}
            
            {/* Begin modal body content */}
            {/* Search and Filter Bar */}
            <VStack space="sm" className="mb-3">
              {/* Search */}
              <Input className="mb-2">
                <HStack className="items-center w-full">
                  <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search products..."
                    value={productSearchQuery}
                    onChangeText={(text) => {
                      setProductSearchQuery(text);
                      setCurrentPage(1); // Reset to first page when searching
                    }}
                    style={{
                      height: 40,
                      fontSize: 16,
                      width: productSearchQuery ? '85%' : '90%',
                    }}
                  />
                  {productSearchQuery ? (
                    <TouchableOpacity
                      onPress={() => {
                        setProductSearchQuery('');
                        setCurrentPage(1);
                      }}
                      style={{ padding: 5 }}
                    >
                      <Text style={{ color: '#94A3B8', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </HStack>
              </Input>
              
              {/* Sort Buttons */}
              <HStack className="justify-between mb-2">
                <Button
                  size="sm"
                  variant={sortBy === 'recent' ? 'solid' : 'outline'}
                  className={sortBy === 'recent' ? 'bg-indigo-600' : 'border-slate-300'}
                  onPress={() => setSortBy('recent')}
                >
                  <ButtonText className={sortBy === 'recent' ? 'text-white' : 'text-slate-700'}>
                    Recent
                  </ButtonText>
                </Button>
                <Button
                  size="sm"
                  variant={sortBy === 'popular' ? 'solid' : 'outline'}
                  className={sortBy === 'popular' ? 'bg-indigo-600' : 'border-slate-300'}
                  onPress={() => setSortBy('popular')}
                >
                  <ButtonText className={sortBy === 'popular' ? 'text-white' : 'text-slate-700'}>
                    Most Viewed
                  </ButtonText>
                </Button>
                <Button
                  size="sm"
                  variant={sortBy === 'price' ? 'solid' : 'outline'}
                  className={sortBy === 'price' ? 'bg-indigo-600' : 'border-slate-300'}
                  onPress={() => setSortBy('price')}
                >
                  <ButtonText className={sortBy === 'price' ? 'text-white' : 'text-slate-700'}>
                    Price
                  </ButtonText>
                </Button>
              </HStack>
              
              {/* Results count */}
              <Text className="text-xs text-slate-500">
                {filteredAndSortedProducts.length} product{filteredAndSortedProducts.length === 1 ? '' : 's'} found
                {myProducts.length === 0 && " (No products available)"}
              </Text>
              {/* Debug buttons */}
              <HStack className="mt-2 justify-between">
                <TouchableOpacity 
                  onPress={() => {
                    console.log('myProducts:', myProducts.length, myProducts);
                    console.log('filteredAndSortedProducts:', filteredAndSortedProducts.length);
                    console.log('paginatedProducts:', paginatedProducts.length);
                    
                    // Refresh products by reloading data
                    loadData();
                  }}
                  style={{ padding: 5 }}
                >
                  <Text style={{ color: '#4F46E5', textDecorationLine: 'underline', fontSize: 14 }}>
                    Refresh Products
                  </Text>
                </TouchableOpacity>
              </HStack>
            </VStack>
            
            {/* Info message when no products are found */}
            {myProducts.length === 0 && (
              <Text className="text-xs text-orange-500 mb-2 text-center">
                No products found for this seller. Try refreshing or adding products to your inventory.
              </Text>
            )}
            
            {/* Product List */}
            <ScrollView className="max-h-[350px] min-h-[200px] border border-slate-100 rounded-md p-1" showsVerticalScrollIndicator={true}>
              {paginatedProducts && paginatedProducts.length > 0 ? (
                paginatedProducts.map((item) => (
                  <TouchableOpacity
                    key={item.id || Math.random().toString()}
                    className="p-3 border-b border-slate-100"
                    onPress={() => handleSelectProduct(item)}
                  >
                    <HStack className="items-center">
                      <Box className="w-[60px] h-[60px] bg-slate-100 rounded-lg overflow-hidden mr-3">
                        {item?.featuredImage ? (
                          <Image
                            source={{ uri: item.featuredImage }}
                            alt={item.name || "Product"}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Box className="w-full h-full items-center justify-center bg-slate-200">
                            <Package size={24} color="#94A3B8" />
                          </Box>
                        )}
                      </Box>
                      
                      <VStack className="flex-1">
                        <Text className="text-sm text-slate-500">
                          {item.brand || 'No Brand'}
                        </Text>
                        
                        <Text className="text-base font-medium text-slate-800">
                          {item.name}
                        </Text>
                        
                        <HStack className="items-center mt-1">
                          <Text className="text-sm text-slate-600 font-medium mr-3">
                            ₹{item.basePrice}
                          </Text>
                          <Text className="text-xs text-slate-500 mr-3">
                            Stock: {item.stockQuantity}
                          </Text>
                          {item.viewCount && item.viewCount > 0 && (
                            <Text className="text-xs text-slate-400">
                              {item.viewCount} views
                            </Text>
                          )}
                        </HStack>
                      </VStack>
                      
                      <Button
                        variant="outline"
                        size="xs"
                        className="ml-2 border-indigo-300"
                        onPress={() => handleSelectProduct(item)}
                      >
                        <ButtonText className="text-indigo-700">Select</ButtonText>
                      </Button>
                    </HStack>
                  </TouchableOpacity>
                ))
              ) : (
                <Box className="items-center justify-center py-10">
                  <ShoppingBag size={40} color="#D1D5DB" />
                  <Text className="mt-2 text-slate-700 font-medium">
                    {productSearchQuery ? 'No matching products' : myProducts.length > 0 ? 'No products match your filters' : 'No products found'}
                  </Text>
                  <Text className="mt-1 text-slate-500 text-center mb-4">
                    {productSearchQuery 
                      ? 'Try a different search term' 
                      : myProducts.length > 0
                        ? 'Try a different sort option'
                        : 'You need to add products before creating bids'}
                  </Text>
                  <Text className="text-xs text-slate-400 text-center mb-2">
                    Products found: {myProducts.length}, Filtered: {filteredAndSortedProducts.length}, Current page: {paginatedProducts.length}
                  </Text>
                  
                  {/* Debugging actions if no products are found */}
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="mb-3"
                    onPress={() => {
                      loadData(); 
                      toast.show({
                        render: () => (
                          <Toast action="info" variant="solid">
                            <VStack space="xs">
                              <ToastTitle>Refreshing</ToastTitle>
                              <ToastDescription>Trying to reload products...</ToastDescription>
                            </VStack>
                          </Toast>
                        )
                      });
                    }}
                  >
                    <ButtonText>Reload Products</ButtonText>
                  </Button>
                  
                  {productSearchQuery && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300"
                      onPress={() => {
                        setProductSearchQuery('');
                        setCurrentPage(1);
                      }}
                    >
                      <ButtonText className="text-red-700">Clear Search</ButtonText>
                    </Button>
                  )}
                </Box>
              )}
            </ScrollView>
            

          </ModalBody>

          <ModalFooter>
            <VStack style={{ width: '100%' }} space="sm">
              {/* Pagination Controls - only show if there are multiple pages */}
              {totalPages > 1 && (
                <HStack className="justify-center items-center mb-2 w-full">
                  <Button
                    size="xs"
                    variant="outline"
                    isDisabled={currentPage === 1}
                    onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="border-slate-300 mr-1"
                  >
                    <ButtonText>Prev</ButtonText>
                  </Button>
                  
                  <Text className="mx-3 text-sm text-slate-600">
                    Page {currentPage} of {totalPages}
                  </Text>
                  
                  <Button
                    size="xs"
                    variant="outline"
                    isDisabled={currentPage === totalPages}
                    onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="border-slate-300 ml-1"
                  >
                    <ButtonText>Next</ButtonText>
                  </Button>
                </HStack>
              )}
              
              {/* Action buttons */}
              <HStack className="justify-between w-full">
                <Button
                  variant="solid"
                  size="sm"
                  className="bg-indigo-600"
                  onPress={() => {
                    loadData();
                    toast.show({
                      render: () => (
                        <Toast action="info" variant="solid">
                          <VStack space="xs">
                            <ToastTitle>Refreshing Products</ToastTitle>
                            <ToastDescription>Loading your latest products...</ToastDescription>
                          </VStack>
                        </Toast>
                      )
                    });
                  }}
                >
                  <ButtonText>Refresh Products</ButtonText>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => setProductModalVisible(false)}
                >
                  <ButtonText>Close</ButtonText>
                </Button>
              </HStack>
            </VStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Custom date picker modal */}
      <Modal
        isOpen={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
      >
        <ModalBackdrop />
        <ModalContent className="w-[90%] max-w-[400px]">
          <ModalHeader>
            <Heading size="md">Select Date & Time</Heading>
            <ModalCloseButton />
          </ModalHeader>
          
          <ModalBody>
            <VStack space="md" className="mb-4">
              {/* Calendar View */}
              <VStack className="border border-slate-200 rounded-xl p-4 mb-4 bg-white">
                <Text className="text-sm font-medium text-slate-700 mb-2">Select Date</Text>
                
                {/* Month and Year Selector */}
                <HStack className="justify-between items-center mb-4">
                  <TouchableOpacity
                    onPress={() => {
                      const prevMonth = new Date(tempDate);
                      prevMonth.setMonth(prevMonth.getMonth() - 1);
                      setTempDate(prevMonth);
                    }}
                    className="p-2"
                  >
                    <Text className="text-indigo-600">←</Text>
                  </TouchableOpacity>
                  
                  <Text className="text-base font-medium text-slate-800">
                    {tempDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  
                  <TouchableOpacity
                    onPress={() => {
                      const nextMonth = new Date(tempDate);
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      setTempDate(nextMonth);
                    }}
                    className="p-2"
                  >
                    <Text className="text-indigo-600">→</Text>
                  </TouchableOpacity>
                </HStack>
                
                {/* Days of Week Header */}
                <HStack className="justify-between mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <Text key={day} className="text-xs text-slate-500 text-center" style={{ width: 36 }}>
                      {day}
                    </Text>
                  ))}
                </HStack>
                
                {/* Calendar Grid */}
                <VStack>
                  {(() => {
                    // Create calendar grid
                    const month = tempDate.getMonth();
                    const year = tempDate.getFullYear();
                    const firstDay = new Date(year, month, 1);
                    const lastDay = new Date(year, month + 1, 0);
                    const daysInMonth = lastDay.getDate();
                    const startingDay = firstDay.getDay(); // 0 for Sunday
                    
                    // Get today for comparison
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Generate calendar grid
                    const days = [];
                    let day = 1;
                    
                    // Create weeks
                    for (let i = 0; i < 6; i++) {
                      if (day > daysInMonth) break;
                      
                      const week = [];
                      // Create days in a week
                      for (let j = 0; j < 7; j++) {
                        if ((i === 0 && j < startingDay) || day > daysInMonth) {
                          // Empty cell
                          week.push(<Box key={`empty-${i}-${j}`} style={{ width: 36, height: 36 }} />);
                        } else {
                          // Date cell
                          const dateObj = new Date(year, month, day);
                          const isToday = dateObj.getTime() === today.getTime();
                          const isSelected = dateObj.getDate() === tempDate.getDate() && 
                                            dateObj.getMonth() === tempDate.getMonth() &&
                                            dateObj.getFullYear() === tempDate.getFullYear();
                          const isPast = dateObj < today;
                          
                          week.push(
                            <TouchableOpacity
                              key={`day-${day}`}
                              onPress={() => {
                                if (!isPast) {
                                  const newDate = new Date(tempDate);
                                  newDate.setDate(day);
                                  setTempDate(newDate);
                                }
                              }}
                              style={{
                                width: 36,
                                height: 36,
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: 18,
                                backgroundColor: isSelected ? '#4F46E5' : isToday ? '#E0E7FF' : 'transparent',
                              }}
                              disabled={isPast}
                            >
                              <Text
                                style={{
                                  color: isPast ? '#CBD5E1' : 
                                        isSelected ? '#FFFFFF' : 
                                        isToday ? '#4F46E5' : 
                                        '#1E293B'
                                }}
                              >
                                {day}
                              </Text>
                            </TouchableOpacity>
                          );
                          day++;
                        }
                      }
                      
                      days.push(
                        <HStack key={`week-${i}`} className="justify-between mb-2">
                          {week}
                        </HStack>
                      );
                    }
                    
                    return days;
                  })()}
                </VStack>
              </VStack>
              
              {/* Time Selector */}
              <VStack className="border border-slate-200 rounded-xl p-4 bg-white">
                <Text className="text-sm font-medium text-slate-700 mb-3">Select Time</Text>
                
                <HStack className="items-center justify-center">
                  {/* Hour */}
                  <HStack className="items-center mr-2">
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedHour(prev => prev === 12 ? 11 : prev - 1 || 12);
                      }}
                      className="p-2"
                    >
                      <Text className="text-indigo-600">−</Text>
                    </TouchableOpacity>
                    
                    <Box className="w-[40px] h-[40px] bg-slate-100 rounded-md items-center justify-center mx-1">
                      <Text className="text-lg font-medium text-slate-800">{selectedHour}</Text>
                    </Box>
                    
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedHour(prev => prev === 12 ? 1 : (prev + 1));
                      }}
                      className="p-2"
                    >
                      <Text className="text-indigo-600">+</Text>
                    </TouchableOpacity>
                  </HStack>
                  
                  <Text className="text-lg font-bold mx-1 text-slate-800">:</Text>
                  
                  {/* Minute */}
                  <HStack className="items-center mr-3">
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedMinute(prev => prev === 0 ? 55 : (prev - 5));
                      }}
                      className="p-2"
                    >
                      <Text className="text-indigo-600">−</Text>
                    </TouchableOpacity>
                    
                    <Box className="w-[40px] h-[40px] bg-slate-100 rounded-md items-center justify-center mx-1">
                      <Text className="text-lg font-medium text-slate-800">
                        {selectedMinute.toString().padStart(2, '0')}
                      </Text>
                    </Box>
                    
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedMinute(prev => (prev + 5) % 60);
                      }}
                      className="p-2"
                    >
                      <Text className="text-indigo-600">+</Text>
                    </TouchableOpacity>
                  </HStack>
                  
                  {/* AM/PM */}
                  <HStack className="bg-slate-100 rounded-md overflow-hidden">
                    <TouchableOpacity
                      style={{
                        backgroundColor: selectedAmPm === 'AM' ? '#4F46E5' : 'transparent',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                      }}
                      onPress={() => setSelectedAmPm('AM')}
                    >
                      <Text style={{
                        color: selectedAmPm === 'AM' ? '#FFFFFF' : '#1E293B',
                        fontWeight: selectedAmPm === 'AM' ? 'bold' : 'normal',
                      }}>
                        AM
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={{
                        backgroundColor: selectedAmPm === 'PM' ? '#4F46E5' : 'transparent',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                      }}
                      onPress={() => setSelectedAmPm('PM')}
                    >
                      <Text style={{
                        color: selectedAmPm === 'PM' ? '#FFFFFF' : '#1E293B',
                        fontWeight: selectedAmPm === 'PM' ? 'bold' : 'normal',
                      }}>
                        PM
                      </Text>
                    </TouchableOpacity>
                  </HStack>
                </HStack>
              </VStack>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <HStack className="w-full justify-between">
              <Button
                variant="outline"
                onPress={() => setDatePickerVisible(false)}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              
              <Button
                variant="solid"
                className="bg-indigo-600"
                onPress={() => {
                  // Create a new date object from the selected date and time
                  const newDate = new Date(tempDate);
                  
                  // Set the time
                  let hours = selectedHour;
                  if (selectedAmPm === 'PM' && hours !== 12) {
                    hours += 12;
                  } else if (selectedAmPm === 'AM' && hours === 12) {
                    hours = 0;
                  }
                  
                  newDate.setHours(hours, selectedMinute, 0, 0);
                  
                  // Update the end date state
                  setEndDate(newDate);
                  
                  // Close the modal
                  setDatePickerVisible(false);
                }}
              >
                <ButtonText>Confirm</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
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
  productItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  messagesButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Tab Bar Styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#4F46E5',
  },
  
  // Bids List Styles
  bidsList: {
    padding: 16,
    paddingBottom: 100,
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
  createButton: {
    paddingHorizontal: 24,
    backgroundColor: '#4F46E5',
    marginTop: 16,
  },
  
  // Create Form Styles
  createFormContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  createFormContent: {
    padding: 16,
    paddingBottom: 100,
  },
  input: {
    height: 44,
    fontSize: 16,
    color: '#0F172A',
    width: '100%',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  datePickerText: {
    fontSize: 16,
    color: '#0F172A',
  },
  
  // Delete Button
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bidModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#64748B',
    fontWeight: '600',
  },
  modalContent: {
    maxHeight: '70%',
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 24,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  
  // Empty Offers State
  emptyOffersState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyOffersText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
  
  // Products List
  productsList: {
    maxHeight: '70%',
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyProductsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyProductsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyProductsText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  
  // Section Header
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  
  // Product Selection Modal Styles
  productSelectScrollView: {
    maxHeight: 350,
  },
});
