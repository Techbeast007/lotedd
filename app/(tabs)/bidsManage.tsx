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
import { useRouter } from 'expo-router';
import { Activity, Calendar, Gavel, Package, Plus, ShoppingBag, Trash2, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
// Using custom date picker implementation with gluestack-ui components
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser } from '@/services/authService';
import { Bid, BidOffer, createBid, deleteBid, getBidOffersByBidId, getBids, updateBidOfferStatus } from '@/services/biddingService';
import { Product, getPopularProducts, getProductsByOwnerId } from '@/services/productService';

export default function ManageBidsScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const currentUser = getCurrentUser();
  
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
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bidOffers, setBidOffers] = useState<BidOffer[]>([]);
  
  // New bid form state
  const [formProduct, setFormProduct] = useState<Product | null>(null);
  const [basePrice, setBasePrice] = useState('');
  const [moq, setMoq] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Product selection modal state
  const [productModalVisible, setProductModalVisible] = useState(false);
  
  // Load data
  useEffect(() => {
    if (!currentUser) {
      setError('You must be logged in to manage bids');
      setIsLoading(false);
      return;
    }
    
    loadData();
  }, [currentUser, loadData]);
  
  // Load all required data
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      // Get seller's bids
      const sellerBids = await getBids({ sellerId: currentUser.uid });
      console.log('Seller bids loaded:', sellerBids.length);
      sellerBids.forEach((bid, index) => {
        console.log(`Bid ${index + 1}:`, bid.id, 'bidCount:', bid.bidCount);
      });
      setBids(sellerBids);
      
      // Get seller's products
      const products = await getProductsByOwnerId(currentUser.uid);
      setMyProducts(products);
      
      // Get popular products for recommendations
      const popular = await getPopularProducts(10);
      setPopularProducts(popular);
    } catch (err) {
      console.error('Failed to fetch bids:', err);
      setError('Could not load bids. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);
  
  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);
  
  // Handle bid card press - view details and offers
  const handleBidPress = useCallback(async (bid: Bid) => {
    try {
      console.log('Opening bid details:', bid.id);
      setSelectedBid(bid);
      
      // Fetch bid offers
      const offers = await getBidOffersByBidId(bid.id!);
      console.log('Bid offers fetched:', offers.length, 'offers found');
      
      // If no offers are found, create a test offer to debug display
      if (offers.length === 0 && bid.bidCount && bid.bidCount > 0) {
        console.log('Adding test offer for debugging purposes');
        const testOffer = {
          id: 'test-offer-id',
          bidId: bid.id!,
          productId: bid.productId,
          sellerId: bid.sellerId,
          buyerId: 'test-buyer-id',
          buyerName: 'Test Buyer',
          bidAmount: bid.basePrice * 1.1,  // 10% more than base price
          quantity: bid.moq,
          status: 'pending' as const,
          message: 'This is a test bid offer for debugging',
          createdAt: new Date()
        };
        setBidOffers([testOffer]);
      } else {
        setBidOffers(offers);
      }
      
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
    if (!formProduct || !currentUser) {
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
      
      await createBid({
        productId: formProduct.id!,
        sellerId: currentUser.uid,
        basePrice: basePriceNum,
        moq: moqNum,
        bidEndTime: endDate,
        status: 'open',
        description,
        productDetails: formProduct,
      });
      
      // Close modal and reset form
      setCreateModalVisible(false);
      setFormProduct(null);
      setBasePrice('');
      setMoq('');
      setDescription('');
      setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      
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
      
      // Refresh data
      loadData();
      setActiveTab('active');
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
  }, [formProduct, currentUser, basePrice, moq, description, endDate, toast, loadData]);
  
  // Date picker is now handled by the DateTimePickerModal component directly
  
  // Select a product for bid
  const handleSelectProduct = (product: Product) => {
    setFormProduct(product);
    setSelectedProduct(product);
    setBasePrice(product.basePrice.toString());
    setMoq('1'); // Default MOQ
    setProductModalVisible(false);
  };
  
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
        >
          <ButtonText>Try Again</ButtonText>
        </Button>
      </View>
    );
  }
  
  return (
    <View style={[
      styles.container, 
      { paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight }
    ]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Heading size="xl" style={styles.headerTitle}>Manage Bids</Heading>
        <Text style={styles.headerSubtitle}>Create and manage your product bids</Text>
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
        // Create Bid Form
        <ScrollView 
          style={styles.createFormContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.createFormContent}
        >
          <Card className="p-4 rounded-xl mb-4">
            <Text className="text-base font-semibold text-slate-800 mb-4">
              Create a New Bid
            </Text>
            
            {/* Product Selection */}
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Select a Product
            </Text>
            
            {selectedProduct ? (
              <TouchableOpacity
                className="flex-row items-center bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200"
                onPress={() => setProductModalVisible(true)}
              >
                <Box className="w-[60px] h-[60px] bg-slate-100 rounded-lg overflow-hidden mr-3">
                  {selectedProduct?.featuredImage ? (
                    <Image
                      source={{ uri: selectedProduct.featuredImage }}
                      alt={selectedProduct.name || "Product"}
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
                    {selectedProduct.brand || 'No Brand'}
                  </Text>
                  
                  <Text className="text-base font-medium text-slate-800">
                    {selectedProduct.name}
                  </Text>
                  
                  <Text className="text-sm text-slate-600">
                    ₹{selectedProduct.basePrice} • Stock: {selectedProduct.stockQuantity}
                  </Text>
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
                <Text className="text-sm font-medium text-slate-700">
                  Base Price (₹)
                </Text>
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
                <Text className="text-sm font-medium text-slate-700">
                  Minimum Order Quantity
                </Text>
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
                <Text className="text-sm font-medium text-slate-700">
                  Bid End Date
                </Text>
              </FormControlLabel>
              
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {endDate.toLocaleDateString('en-US', {
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <Calendar size={20} color="#64748B" />
              </TouchableOpacity>
              
              {/* Custom Date Time Picker Modal */}
              <Modal 
                isOpen={showDatePicker} 
                onClose={() => setShowDatePicker(false)}
              >
                <ModalBackdrop />
                <ModalContent className="w-[90%] max-w-[400px]">
                  <ModalHeader>
                    <Heading size="md">Select Date & Time</Heading>
                    <ModalCloseButton />
                  </ModalHeader>
                  
                  <ModalBody>
                    <VStack space="md">
                      {/* Year and Month Selector */}
                      <HStack className="justify-between items-center mb-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onPress={() => {
                            const newDate = new Date(endDate);
                            newDate.setMonth(endDate.getMonth() - 1);
                            setEndDate(newDate);
                          }}
                        >
                          <ButtonText>◀</ButtonText>
                        </Button>
                        
                        <Text className="text-lg font-medium">
                          {endDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </Text>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onPress={() => {
                            const newDate = new Date(endDate);
                            newDate.setMonth(endDate.getMonth() + 1);
                            setEndDate(newDate);
                          }}
                        >
                          <ButtonText>▶</ButtonText>
                        </Button>
                      </HStack>
                      
                      {/* Days Grid */}
                      <Box className="mb-4">
                        {/* Day names header */}
                        <HStack className="justify-between mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <Text key={day} className="text-center flex-1 text-slate-500 font-medium">
                              {day}
                            </Text>
                          ))}
                        </HStack>
                        
                        {/* Calendar grid - simplified version */}
                        <Box className="flex-row flex-wrap">
                          {Array.from({ length: 31 }).map((_, i) => {
                            const dayNum = i + 1;
                            const isSelected = dayNum === endDate.getDate();
                            
                            return (
                              <TouchableOpacity 
                                key={dayNum}
                                className={`w-[14.28%] aspect-square items-center justify-center ${
                                  isSelected ? 'bg-blue-100' : ''
                                }`}
                                onPress={() => {
                                  const newDate = new Date(endDate);
                                  newDate.setDate(dayNum);
                                  setEndDate(newDate);
                                }}
                              >
                                <Text className={isSelected ? 'text-blue-600 font-bold' : ''}>
                                  {dayNum}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </Box>
                      </Box>
                      
                      {/* Time Selector */}
                      <HStack className="justify-around items-center py-4">
                        {/* Hours */}
                        <VStack className="items-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onPress={() => {
                              const newDate = new Date(endDate);
                              newDate.setHours(endDate.getHours() + 1);
                              setEndDate(newDate);
                            }}
                          >
                            <ButtonText>▲</ButtonText>
                          </Button>
                          
                          <Text className="text-xl font-bold my-2">
                            {endDate.getHours().toString().padStart(2, '0')}
                          </Text>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onPress={() => {
                              const newDate = new Date(endDate);
                              newDate.setHours(endDate.getHours() - 1);
                              setEndDate(newDate);
                            }}
                          >
                            <ButtonText>▼</ButtonText>
                          </Button>
                        </VStack>
                        
                        <Text className="text-xl font-bold">:</Text>
                        
                        {/* Minutes */}
                        <VStack className="items-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onPress={() => {
                              const newDate = new Date(endDate);
                              newDate.setMinutes(endDate.getMinutes() + 5);
                              setEndDate(newDate);
                            }}
                          >
                            <ButtonText>▲</ButtonText>
                          </Button>
                          
                          <Text className="text-xl font-bold my-2">
                            {endDate.getMinutes().toString().padStart(2, '0')}
                          </Text>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onPress={() => {
                              const newDate = new Date(endDate);
                              newDate.setMinutes(endDate.getMinutes() - 5);
                              setEndDate(newDate);
                            }}
                          >
                            <ButtonText>▼</ButtonText>
                          </Button>
                        </VStack>
                      </HStack>
                    </VStack>
                  </ModalBody>
                  
                  <ModalFooter>
                    <HStack space="md">
                      <Button 
                        variant="outline" 
                        onPress={() => setShowDatePicker(false)}
                      >
                        <ButtonText>Cancel</ButtonText>
                      </Button>
                      <Button 
                        onPress={() => setShowDatePicker(false)}
                      >
                        <ButtonText>Confirm</ButtonText>
                      </Button>
                    </HStack>
                  </ModalFooter>
                </ModalContent>
              </Modal>
            </FormControl>
            
            {/* Description */}
            <FormControl className="mb-4">
              <FormControlLabel>
                <Text className="text-sm font-medium text-slate-700">
                  Description (Optional)
                </Text>
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
          
          {/* Popular Products Recommendations */}
          <View style={styles.sectionHeader}>
            <Heading size="sm">Popular Products</Heading>
            <Text style={styles.sectionSubtitle}>
              These popular products are good candidates for bidding
            </Text>
          </View>
          
          {popularProducts.slice(0, 3).map((product, index) => (
            <Card key={index} className="p-3 rounded-xl mb-3">
              <HStack className="items-center">
                <Box className="w-[60px] h-[60px] bg-slate-100 rounded-lg overflow-hidden mr-3">
                  {product?.featuredImage ? (
                    <Image
                      source={{ uri: product.featuredImage }}
                      alt={product.name || "Product"}
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
                    {product.brand || 'No Brand'}
                  </Text>
                  
                  <Text className="text-base font-medium text-slate-800 mb-1">
                    {product.name}
                  </Text>
                  
                  <HStack className="items-center">
                    <Text className="text-xs text-slate-500 mr-2">
                      {product.viewCount || 0} views
                    </Text>
                    
                    <Text className="text-xs text-slate-500">
                      ₹{product.basePrice}
                    </Text>
                  </HStack>
                </VStack>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  onPress={() => handleSelectProduct(product)}
                >
                  <ButtonText>Select</ButtonText>
                </Button>
              </HStack>
            </Card>
          ))}
        </ScrollView>
      ) : (
        // Bids List
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
        <ModalContent className="w-[90%] max-w-[400px]">
          <ModalHeader>
            <Heading size="md">Select a Product</Heading>
            <ModalCloseButton />
          </ModalHeader>
          
          <ModalBody>
            <FlatList
              data={myProducts}
              keyExtractor={(item) => item.id || Math.random().toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="p-3 border-b border-slate-100"
                  onPress={() => handleSelectProduct(item)}
                >
                  <HStack className="items-center">
                    <Box className="w-[50px] h-[50px] bg-slate-100 rounded-lg overflow-hidden mr-3">
                      {item?.featuredImage ? (
                        <Image
                          source={{ uri: item.featuredImage }}
                          alt={item.name || "Product"}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Box className="w-full h-full items-center justify-center bg-slate-200">
                          <Package size={20} color="#94A3B8" />
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
                      
                      <Text className="text-sm text-slate-600">
                        ₹{item.basePrice} • Stock: {item.stockQuantity}
                      </Text>
                    </VStack>
                  </HStack>
                </TouchableOpacity>
              )}
              className="max-h-[400px]"
              ListEmptyComponent={
                <Box className="items-center justify-center py-10">
                  <ShoppingBag size={40} color="#D1D5DB" />
                  <Text className="mt-2 text-slate-700 font-medium">
                    No products found
                  </Text>
                  <Text className="mt-1 text-slate-500 text-center">
                    You need to add products before creating bids
                  </Text>
                </Box>
              }
            />
          </ModalBody>
          
          <ModalFooter>
            <Button
              variant="outline"
              onPress={() => setProductModalVisible(false)}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </View>
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
    flex: 1,
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
});
