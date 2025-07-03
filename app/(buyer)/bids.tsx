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
import { useRouter } from 'expo-router';
import { Activity, Clock, DollarSign, Package, ShoppingCart } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser } from '@/services/authService';
import { Bid, BidOffer, getBidOffersByBuyer, getBids, submitBidOffer } from '@/services/biddingService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32; // Full width with padding

// Bid Card Component
const BidCard = ({
  bid,
  onPress,
  onPlaceBid,
}) => {
  const timeLeft = bid.bidEndTime ? new Date(bid.bidEndTime.seconds * 1000) - new Date() : 0;
  const isExpired = timeLeft <= 0;
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  // Format the end date
  const endDate = bid.bidEndTime ? 
    new Date(bid.bidEndTime.seconds * 1000).toLocaleDateString('en-US', {
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    }) : 'Unknown';

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => onPress(bid)}
    >
      <Card className="mb-4 p-4 rounded-xl">
        <HStack space="md" alignItems="center">
          <Box className="relative w-[80px] h-[80px] bg-slate-100 rounded-lg overflow-hidden">
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
            <Box 
              className={`absolute bottom-0 left-0 right-0 py-1 px-2 ${isExpired ? 'bg-red-600' : 'bg-emerald-600'}`}
            >
              <Text className="text-[10px] text-white font-medium text-center">
                {isExpired ? 'EXPIRED' : 'ACTIVE'}
              </Text>
            </Box>
          </Box>
          
          <VStack flex={1} space="xs">
            <Text className="text-sm text-slate-500 font-medium">
              {bid.productDetails?.brand || 'No Brand'}
            </Text>
            
            <Heading size="sm" className="mb-1">
              {bid.productDetails?.name || 'Product Name'}
            </Heading>
            
            <HStack space="sm" alignItems="center">
              <DollarSign size={14} color="#64748B" />
              <Text className="text-sm font-semibold text-slate-600">
                Base Price: ₹{bid.basePrice}
              </Text>
            </HStack>
            
            <HStack space="sm" alignItems="center">
              <Package size={14} color="#64748B" />
              <Text className="text-sm font-medium text-slate-500">
                MOQ: {bid.moq} units
              </Text>
            </HStack>
          </VStack>
        </HStack>
        
        <Divider className="my-3" />
        
        <HStack justifyContent="space-between" alignItems="center">
          <VStack>
            <HStack space="xs" alignItems="center">
              <Clock size={14} color="#64748B" />
              <Text className="text-xs text-slate-500">
                Ends: {endDate}
              </Text>
            </HStack>
            
            {bid.bidCount !== undefined && (
              <HStack space="xs" alignItems="center" className="mt-1">
                <Activity size={14} color="#64748B" />
                <Text className="text-xs text-slate-500">
                  {bid.bidCount} {bid.bidCount === 1 ? 'bid' : 'bids'} placed
                </Text>
              </HStack>
            )}
          </VStack>
          
          <Button
            size="sm"
            variant={isExpired ? "outline" : "solid"}
            className={isExpired ? "border-slate-300" : "bg-indigo-600"}
            isDisabled={isExpired}
            onPress={() => !isExpired && onPlaceBid(bid)}
          >
            <ButtonText>
              {isExpired ? 'Ended' : 'Place Bid'}
            </ButtonText>
          </Button>
        </HStack>
      </Card>
    </TouchableOpacity>
  );
};

// Main Bids Screen Component
export default function BidsScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const currentUser = getCurrentUser();
  
  // State management
  const [bids, setBids] = useState<Bid[]>([]);
  const [myBids, setMyBids] = useState<BidOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'explore' | 'my-bids'>('explore');
  
  // Modal state
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidQuantity, setBidQuantity] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load bids
  useEffect(() => {
    loadData();
  }, []);
  
  // Load all required data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get active bids
      const activeBids = await getBids({ status: 'open' });
      
      // Get user's bid offers if logged in
      if (currentUser) {
        const userBidOffers = await getBidOffersByBuyer(currentUser.uid);
        setMyBids(userBidOffers);
      }
      
      setBids(activeBids);
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
  
  // Handle bid card press - view details
  const handleBidPress = useCallback((bid: Bid) => {
    router.push(`/bid/${bid.id}`);
  }, [router]);
  
  // Handle place bid button
  const handlePlaceBid = useCallback((bid: Bid) => {
    setSelectedBid(bid);
    setBidAmount(bid.basePrice.toString());
    setBidQuantity(bid.moq.toString());
    setBidMessage('');
    setBidModalVisible(true);
  }, []);
  
  // Submit bid offer
  const handleSubmitBid = useCallback(async () => {
    if (!selectedBid || !currentUser) {
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
    
    if (isNaN(bidQuantityNum) || bidQuantityNum < selectedBid.moq) {
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
        bidId: selectedBid.id!,
        productId: selectedBid.productId,
        sellerId: selectedBid.sellerId,
        bidAmount: bidAmountNum,
        quantity: bidQuantityNum,
        message: bidMessage,
      });
      
      // Close modal and refresh data
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
      
      // Refresh data
      loadData();
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
  }, [selectedBid, currentUser, bidAmount, bidQuantity, bidMessage, toast, loadData]);
  
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
        <Heading size="xl" style={styles.headerTitle}>Bidding</Heading>
        <Text style={styles.headerSubtitle}>Explore and place bids on products</Text>
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'explore' && styles.activeTab]}
          onPress={() => setActiveTab('explore')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'explore' && styles.activeTabText
          ]}>
            Explore Bids
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-bids' && styles.activeTab]}
          onPress={() => setActiveTab('my-bids')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'my-bids' && styles.activeTabText
          ]}>
            My Bids
          </Text>
          {myBids.length > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{myBids.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Content based on active tab */}
      {activeTab === 'explore' ? (
        // Explore Bids tab
        <FlatList
          data={bids}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <BidCard
              bid={item}
              onPress={handleBidPress}
              onPlaceBid={handlePlaceBid}
            />
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
              <Package size={60} color="#D1D5DB" />
              <Heading size="md" style={styles.emptyStateTitle}>No active bids found</Heading>
              <Text style={styles.emptyStateText}>
                There are currently no active bids available. Check back later!
              </Text>
            </View>
          }
        />
      ) : (
        // My Bids tab
        <FlatList
          data={myBids}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <Card className="mb-4 p-4 rounded-xl">
              <HStack space="md" alignItems="center">
                <Box className="w-[60px] h-[60px] bg-slate-100 rounded-lg items-center justify-center">
                  <ShoppingCart size={24} color="#64748B" />
                </Box>
                
                <VStack flex={1}>
                  <HStack justifyContent="space-between">
                    <Text className="text-sm text-slate-500 font-medium">
                      Bid ID: {item.id?.substring(0, 8)}...
                    </Text>
                    
                    <Box 
                      className={`py-1 px-2 rounded-full ${
                        item.status === 'accepted' ? 'bg-green-100' :
                        item.status === 'rejected' ? 'bg-red-100' :
                        item.status === 'counteroffered' ? 'bg-amber-100' : 'bg-blue-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          item.status === 'accepted' ? 'text-green-800' :
                          item.status === 'rejected' ? 'text-red-800' :
                          item.status === 'counteroffered' ? 'text-amber-800' : 'text-blue-800'
                        }`}
                      >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Text>
                    </Box>
                  </HStack>
                  
                  <HStack space="sm" alignItems="center" className="mt-2">
                    <DollarSign size={14} color="#64748B" />
                    <Text className="text-sm font-semibold text-slate-600">
                      Your Bid: ₹{item.bidAmount}
                    </Text>
                  </HStack>
                  
                  <HStack space="sm" alignItems="center" className="mt-1">
                    <Package size={14} color="#64748B" />
                    <Text className="text-sm font-medium text-slate-500">
                      Quantity: {item.quantity} units
                    </Text>
                  </HStack>
                  
                  <TouchableOpacity
                    className="mt-3"
                    onPress={() => router.push(`/bid/${item.bidId}`)}
                  >
                    <Text className="text-sm font-medium text-indigo-600">
                      View Details →
                    </Text>
                  </TouchableOpacity>
                </VStack>
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
              <ShoppingCart size={60} color="#D1D5DB" />
              <Heading size="md" style={styles.emptyStateTitle}>No bids placed yet</Heading>
              <Text style={styles.emptyStateText}>
                You haven't placed any bids yet. Start bidding on products to see them here!
              </Text>
              <Button
                size="md"
                variant="solid"
                className="mt-4 bg-indigo-600"
                onPress={() => setActiveTab('explore')}
              >
                <ButtonText>Explore Bids</ButtonText>
              </Button>
            </View>
          }
        />
      )}
      
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
              {selectedBid && (
                <>
                  {/* Product Info */}
                  <HStack space="md" alignItems="center" className="mb-4">
                    <Box className="w-[60px] h-[60px] bg-slate-100 rounded-lg overflow-hidden">
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
                    
                    <VStack flex={1}>
                      <Text className="text-sm text-slate-500 font-medium">
                        {selectedBid.productDetails?.brand || 'No Brand'}
                      </Text>
                      
                      <Heading size="sm" className="mb-1">
                        {selectedBid.productDetails?.name || 'Product Name'}
                      </Heading>
                      
                      <HStack space="xs" alignItems="center">
                        <Text className="text-xs text-slate-500">Base Price:</Text>
                        <Text className="text-sm font-semibold text-slate-700">
                          ₹{selectedBid.basePrice}
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>
                  
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
                    <Text style={styles.inputLabel}>Quantity (Min: {selectedBid.moq})</Text>
                    <TextInput
                      style={styles.input}
                      value={bidQuantity}
                      onChangeText={setBidQuantity}
                      keyboardType="numeric"
                      placeholder={`Enter quantity (min: ${selectedBid.moq})`}
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
                </>
              )}
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
                  <Text style={styles.submitButtonText}>Submit Bid</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#4F46E5',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  }
});
