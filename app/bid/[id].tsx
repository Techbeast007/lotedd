'use client';

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Activity, ArrowLeft, MessageCircle, Package, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser } from '@/services/authService';
import { Bid, BidOffer, getBidById, getBidOffersByBidId, listenToBid, listenToBidOffers, submitBidOffer } from '@/services/biddingService';
import { ParticipantType } from '@/services/chatService';
import { useChatContext } from '@/services/context/ChatContext';

export default function BidDetailsScreen() {
  const params = useLocalSearchParams();
  const bidId = params.id as string;
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const currentUser = getCurrentUser();
  const { getOrCreateConversation } = useChatContext();
  
  // State management
  const [bid, setBid] = useState<Bid | null>(null);
  const [bidOffers, setBidOffers] = useState<BidOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidQuantity, setBidQuantity] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load bid data
  useEffect(() => {
    const loadBidData = async () => {
      try {
        setIsLoading(true);
        
        // Get bid details
        const bidData = await getBidById(bidId);
        setBid(bidData);
        
        // Set initial values for bidding - using safe checks
        if (bidData && bidData.basePrice !== undefined && bidData.moq !== undefined) {
          setBidAmount(String(bidData.basePrice)); // Use String() instead of .toString()
          setBidQuantity(String(bidData.moq)); // Use String() instead of .toString()
        } else {
          // Set fallback values if properties are missing
          setBidAmount('0');
          setBidQuantity('1');
          console.log('Warning: Bid data is incomplete', bidData);
        }
        
        // Get bid offers
        const offers = await getBidOffersByBidId(bidId);
        setBidOffers(offers);
      } catch (err) {
        console.error('Failed to fetch bid details:', err);
        setError(`Could not load bid details: [${err}]`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBidData();
    
    // Set up real-time listeners
    const bidUnsubscribe = listenToBid(bidId, (updatedBid) => {
      setBid(updatedBid);
    });
    
    const offersUnsubscribe = listenToBidOffers(bidId, (updatedOffers) => {
      setBidOffers(updatedOffers);
    });
    
    return () => {
      // Clean up listeners
      bidUnsubscribe && bidUnsubscribe();
      offersUnsubscribe && offersUnsubscribe();
    };
  }, [bidId]);
  
  // Submit bid offer
  const handleSubmitBid = useCallback(async () => {
    if (!bid || !currentUser) {
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>You must be logged in to place a bid</ToastDescription>
            </VStack>
          </Toast>
        )
      });
      return;
    }
    
    const bidAmountNum = parseFloat(bidAmount);
    const bidQuantityNum = parseInt(bidQuantity, 10);
    
    // Validate input
    if (isNaN(bidAmountNum) || bidAmountNum <= 0) {
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Invalid Bid Amount</ToastTitle>
              <ToastDescription>Please enter a valid bid amount</ToastDescription>
            </VStack>
          </Toast>
        )
      });
      return;
    }
    
    if (isNaN(bidQuantityNum) || bidQuantityNum < bid.moq) {
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Invalid Quantity</ToastTitle>
              <ToastDescription>Quantity must be at least the minimum order quantity (MOQ)</ToastDescription>
            </VStack>
          </Toast>
        )
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await submitBidOffer({
        bidId: bid.id!,
        productId: bid.productId,
        sellerId: bid.sellerId,
        bidAmount: bidAmountNum,
        quantity: bidQuantityNum,
        message: bidMessage,
        buyerId: currentUser?.uid || '',
      });
      
      // Close modal
      setBidModalVisible(false);
      
      toast.show({
        render: () => (
          <Toast action="success" variant="solid">
            <VStack space="xs">
              <ToastTitle>Bid Submitted</ToastTitle>
              <ToastDescription>Your bid has been submitted successfully</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    } catch (err) {
      console.error('Failed to submit bid:', err);
      toast.show({
        render: () => (
          <Toast action="error" variant="solid">
            <VStack space="xs">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to submit bid. Please try again.</ToastDescription>
            </VStack>
          </Toast>
        )
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [bid, currentUser, bidAmount, bidQuantity, bidMessage, toast]);
  
  // Start chat with seller function
  const handleChatWithSeller = async () => {
    if (!currentUser) {
      console.error('No current user found');
      toast.show({
        placement: "top",
        render: () => (
          <Toast action="error">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>You must be logged in to chat with the seller</ToastDescription>
          </Toast>
        )
      });
      return;
    }

    if (!bid) {
      console.error('No bid data found');
      toast.show({
        placement: "top",
        render: () => (
          <Toast action="error">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Could not load bid information</ToastDescription>
          </Toast>
        )
      });
      return;
    }
    
    try {
      console.log('Attempting to chat with seller, bid data:', bid);
      
      // Check if seller ID is available and valid
      if (!bid.sellerId || typeof bid.sellerId !== 'string' || bid.sellerId.trim() === '') {
        console.error('Missing or invalid seller ID:', bid.sellerId);
        toast.show({
          placement: "top",
          render: () => (
            <Toast action="error">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Seller information is missing</ToastDescription>
            </Toast>
          )
        });
        return;
      }
      
      // Get seller details - in a real app you might want to fetch the seller's name from user service
      const sellerName = "Seller"; // Use a placeholder since we don't have seller name in the bid object
      
      // Create participant object with no undefined values
      const sellerParticipant = {
        id: bid.sellerId,
        name: sellerName,
        type: ParticipantType.SELLER,
      };
      
      // Create related object with no undefined values
      const relatedToObject = {
        type: 'product' as const,
        id: bid.productId || '', // Empty string fallback
        name: bid.productDetails?.name || 'Product' // Empty string fallback
      };

      console.log('Creating conversation with seller:', sellerParticipant.id);
      
      // Create or get existing conversation with proper validation
      const conversationId = await getOrCreateConversation(
        sellerParticipant,
        relatedToObject
      );
      
      // Navigate to chat
      if (conversationId) {
        console.log('Successfully created conversation:', conversationId);
        // Use replace instead of push to prevent stack navigation issues
        router.replace(`/messages/${conversationId}`);
      } else {
        throw new Error('Failed to create conversation: conversation ID is empty');
      }
      
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.show({
        placement: "top",
        render: () => (
          <Toast action="error">
            <ToastTitle>Could not start chat</ToastTitle>
            <ToastDescription>Please try again later</ToastDescription>
          </Toast>
        )
      });
    }
  };
  
  // Check if user has already bid
  const hasUserBid = bidOffers.some(offer => 
    currentUser && offer.buyerId === currentUser.uid
  );
  
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
  
  // Calculate time left
  const getTimeLeft = (endTime: any) => {
    if (!endTime) return { expired: true, text: 'Expired' };
    
    const endDate = endTime.seconds ? 
      new Date(endTime.seconds * 1000) : 
      new Date(endTime);
      
    const now = new Date();
    const timeLeft = endDate.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
      return { expired: true, text: 'Expired' };
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = '';
    if (days > 0) text += `${days}d `;
    if (hours > 0 || days > 0) text += `${hours}h `;
    text += `${minutes}m`;
    
    return { expired: false, text };
  };
  
  // Defensive rendering for bid details
  const safeValue = (val, fallback = 'N/A') => (val !== undefined && val !== null ? val.toString() : fallback);
  
  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading bid details...</Text>
      </View>
    );
  }
  
  // Error state
  if (error || !bid) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Activity size={60} color="#9CA3AF" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error || 'Bid not found'}</Text>
        <Button
          size="md"
          variant="solid"
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <ButtonText>Go Back</ButtonText>
        </Button>
      </View>
    );
  }
  
  // Time left calculation
  const timeLeftInfo = getTimeLeft(bid.bidEndTime);
  
  return (
    <View style={[
      styles.container, 
      { paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight }
    ]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <Stack.Screen options={{ 
        headerShown: true,
        title: 'Bid Details',
        headerTitleStyle: { fontWeight: '600' },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
        )
      }} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Card */}
        <Card className="p-4 rounded-xl mb-4">
          <HStack className="items-center mb-4">
            <Box className="w-[80px] h-[80px] bg-slate-100 rounded-lg overflow-hidden mr-3">
              {bid.productDetails?.featuredImage ? (
                <Image
                  source={{ uri: bid.productDetails.featuredImage }}
                  alt={bid.productDetails.name || "Product"}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Box className="w-full h-full items-center justify-center bg-slate-200">
                  <Package size={30} color="#94A3B8" />
                </Box>
              )}
            </Box>
            
            <VStack className="flex-1">
              <Text className="text-sm text-slate-500 font-medium">
                {bid.productDetails?.brand || 'No Brand'}
              </Text>
              
              <Heading size="md" className="mb-1">
                {bid.productDetails?.name || 'Product'}
              </Heading>
              
              <HStack className="items-center">
                {timeLeftInfo.expired ? (
                  <Box className="py-1 px-2 rounded-full bg-red-100">
                    <Text className="text-xs font-medium text-red-800">
                      Bid Closed
                    </Text>
                  </Box>
                ) : (
                  <Box className="py-1 px-2 rounded-full bg-green-100">
                    <Text className="text-xs font-medium text-green-800">
                      Bid Open
                    </Text>
                  </Box>
                )}
              </HStack>
            </VStack>
          </HStack>
          
          <Divider className="my-3" />
          
          {/* Bid Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Base Price</Text>
              <Text style={styles.detailValue}>₹{safeValue(bid?.basePrice)}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Minimum Order</Text>
              <Text style={styles.detailValue}>{safeValue(bid?.moq)} units</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>End Date</Text>
              <Text style={styles.detailValue}>{formatDate(bid?.bidEndTime)}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Time Left</Text>
              <Text 
                style={[
                  styles.detailValue, 
                  timeLeftInfo.expired ? styles.expiredText : styles.activeText
                ]}
              >
                {timeLeftInfo.text}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Total Bids</Text>
              <Text style={styles.detailValue}>{bidOffers.length}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text 
                style={[
                  styles.detailValue, 
                  timeLeftInfo.expired ? styles.expiredText : styles.activeText
                ]}
              >
                {timeLeftInfo.expired ? 'Closed' : 'Open'}
              </Text>
            </View>
          </View>
          
          {bid.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{bid.description}</Text>
            </View>
          )}
        </Card>
        
        {/* Bid Button or Your Bid */}
        {!timeLeftInfo.expired && !hasUserBid ? (
          <View>
            <Button
              variant="solid"
              style={styles.placeBidButton}
              onPress={() => setBidModalVisible(true)}
            >
              <ButtonText>Place Your Bid</ButtonText>
            </Button>
            
            {/* Chat with Seller Button */}
            <Button
              variant="outline"
              style={styles.chatWithSellerButton}
              onPress={handleChatWithSeller}
            >
              <HStack space="sm">
                <MessageCircle size={20} color="#3B82F6" />
                <ButtonText>Chat with Seller</ButtonText>
              </HStack>
            </Button>
          </View>
        ) : hasUserBid ? (
          <Card className="p-4 rounded-xl mb-4 bg-indigo-50 border border-indigo-200">
            <HStack className="items-center justify-between">
              <Text className="text-base font-semibold text-indigo-900">
                You&apos;ve placed a bid on this item
              </Text>
            </HStack>
            
            {bidOffers
              .filter(offer => currentUser && offer.buyerId === currentUser.uid)
              .map((userOffer, index) => (
                <View key={index} className="mt-3">
                  <HStack className="items-center space-x-2">
                    <Text className="text-sm text-indigo-800">Your bid amount:</Text>
                    <Text className="text-lg font-semibold text-indigo-900">
                      ₹{userOffer.bidAmount}
                    </Text>
                  </HStack>
                  
                  <HStack className="items-center space-x-2 mt-1">
                    <Text className="text-sm text-indigo-800">Quantity:</Text>
                    <Text className="text-base text-indigo-900">
                      {userOffer.quantity} units
                    </Text>
                  </HStack>
                  
                  <HStack className="items-center space-x-2 mt-1">
                    <Text className="text-sm text-indigo-800">Status:</Text>
                    <Box 
                      className={`py-1 px-2 rounded-full ${
                        userOffer.status === 'accepted' ? 'bg-green-100' :
                        userOffer.status === 'rejected' ? 'bg-red-100' :
                        userOffer.status === 'counteroffered' ? 'bg-amber-100' : 'bg-blue-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          userOffer.status === 'accepted' ? 'text-green-800' :
                          userOffer.status === 'rejected' ? 'text-red-800' :
                          userOffer.status === 'counteroffered' ? 'text-amber-800' : 'text-blue-800'
                        }`}
                      >
                        {userOffer.status.charAt(0).toUpperCase() + userOffer.status.slice(1)}
                      </Text>
                    </Box>
                  </HStack>
                  
                  <HStack className="mt-4 space-x-2">
                    {userOffer.status === 'pending' && !timeLeftInfo.expired && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-indigo-400"
                        onPress={() => setBidModalVisible(true)}
                      >
                        <ButtonText className="text-indigo-700">Update Bid</ButtonText>
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-indigo-400"
                      onPress={handleChatWithSeller}
                    >
                      <HStack space="sm">
                        <MessageCircle size={16} color="#4F46E5" />
                        <ButtonText className="text-indigo-700">Chat with Seller</ButtonText>
                      </HStack>
                    </Button>
                  </HStack>
                </View>
              ))}
          </Card>
        ) : (
          <Card className="p-4 rounded-xl mb-4 bg-gray-50 border border-gray-200">
            <Text className="text-base text-center text-gray-600">
              This bid has ended. New bids can no longer be placed.
            </Text>
          </Card>
        )}
        
        {/* Recent Bids Section */}
        <View style={styles.sectionHeader}>
          <Heading size="md">Recent Bids</Heading>
          <Text style={styles.sectionSubtitle}>
            {bidOffers.length} {bidOffers.length === 1 ? 'bid' : 'bids'} placed
          </Text>
        </View>
        
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
                <View className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <Text className="text-sm text-slate600">{offer.message}</Text>
                </View>
              )}
            </Card>
          ))
        ) : (
          <Card className="p-4 rounded-xl mb-4 bg-slate-50">
            <Text className="text-base text-center text-slate-600">
              No bids have been placed yet.
            </Text>
            
            {!timeLeftInfo.expired && !hasUserBid && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 mx-auto w-40"
                onPress={() => setBidModalVisible(true)}
              >
                <ButtonText>Be the first to bid</ButtonText>
              </Button>
            )}
          </Card>
        )}
      </ScrollView>
      
      {/* Bid Placement Modal */}
      <Modal
        visible={bidModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBidModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bidModalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandleBar} />
              <Heading size="md" style={styles.modalTitle}>Place a Bid</Heading>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setBidModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {/* Modal Content */}
            <View style={styles.modalContent}>
              {/* Bid Input Fields */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Bid Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  keyboardType="numeric"
                  placeholder="Enter your bid amount"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantity (Min: {bid.moq})</Text>
                <TextInput
                  style={styles.input}
                  value={bidQuantity}
                  onChangeText={setBidQuantity}
                  keyboardType="numeric"
                  placeholder={`Enter quantity (min: ${bid.moq})`}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bidMessage}
                  onChangeText={setBidMessage}
                  placeholder="Add a message to the seller"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              {/* Bid Total */}
              <View style={styles.bidTotal}>
                <Text style={styles.bidTotalLabel}>Total Bid Value</Text>
                <Text style={styles.bidTotalValue}>
                  ₹{(parseFloat(bidAmount) * parseInt(bidQuantity, 10) || 0).toFixed(2)}
                </Text>
              </View>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.bidActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setBidModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitBid}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {hasUserBid ? 'Update Bid' : 'Submit Bid'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
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
  
  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  detailItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  expiredText: {
    color: '#EF4444',
  },
  activeText: {
    color: '#10B981',
  },
  
  // Description
  descriptionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
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
  
  // Bid Button
  placeBidButton: {
    marginBottom: 24,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
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
    padding: 20,
    maxHeight: '60%',
  },
  
  // Input Styles
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Bid Total Styles
  bidTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  bidTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  
  // Action Buttons Styles
  bidActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 0.48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  submitButton: {
    flex: 0.48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#818CF8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Chat button styles
  chatWithSellerButton: {
    marginTop: 12,
    backgroundColor: 'transparent',
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
});
