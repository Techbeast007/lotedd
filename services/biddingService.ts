import firestore from '@react-native-firebase/firestore';
import { getCurrentUser } from './authService';
import { Product } from './productService';

// Bid status types
export type BidStatus = 'open' | 'closed' | 'awarded' | 'expired';

// Types for bids
export interface Bid {
  id?: string;
  productId: string;
  sellerId: string;
  basePrice: number;
  moq: number; // Minimum Order Quantity
  bidEndTime: Date | any; // Timestamp when the bid closes
  status: BidStatus;
  description?: string;
  createdAt?: any; // Firestore timestamp
  updatedAt?: any; // Firestore timestamp
  productDetails?: Product; // Optional joined product details
  bidCount?: number; // Number of bids received
}

// Types for bid offers
export interface BidOffer {
  id?: string;
  bidId: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  bidAmount: number;
  quantity: number;
  status: 'pending' | 'accepted' | 'rejected' | 'counteroffered';
  buyerName?: string;
  message?: string;
  createdAt?: any; // Firestore timestamp
  updatedAt?: any; // Firestore timestamp
}

/**
 * Create a new bid for a product
 */
export const createBid = async (bidData: Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to create a bid');
    }

    const bidWithTimestamps = {
      ...bidData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    const bidRef = await firestore().collection('bids').add(bidWithTimestamps);
    return { id: bidRef.id, ...bidWithTimestamps };
  } catch (error) {
    console.error('Error creating bid:', error);
    throw error;
  }
};

/**
 * Get all bids, optionally filtered by seller or status
 */
export const getBids = async (filters?: { sellerId?: string; status?: BidStatus }) => {
  try {
    let bidQuery = firestore().collection('bids');

    // Apply filters if provided
    if (filters?.sellerId) {
      bidQuery = bidQuery.where('sellerId', '==', filters.sellerId);
    }

    if (filters?.status) {
      bidQuery = bidQuery.where('status', '==', filters.status);
    }

    // Apply ordering
    const orderedQuery = bidQuery.orderBy('createdAt', 'desc');
    
    const querySnapshot = await orderedQuery.get();
    
    const bids = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Bid[];

    return bids;
  } catch (error) {
    console.error('Error getting bids:', error);
    throw error;
  }
};

/**
 * Get a single bid by ID
 */
export const getBidById = async (bidId: string) => {
  try {
    const bidSnapshot = await firestore().collection('bids').doc(bidId).get();
    
    if (!bidSnapshot.exists()) {
      throw new Error('Bid not found');
    }
    
    const bidData = { id: bidSnapshot.id, ...bidSnapshot.data() } as Bid;
    
    // If we have productId but productDetails is missing or has no stockQuantity,
    // fetch the product details to ensure we have the latest stock information
    if (bidData.productId && 
        (!bidData.productDetails || bidData.productDetails.stockQuantity === undefined)) {
      try {
        console.log('Fetching product details for bid:', bidId);
        const productSnapshot = await firestore()
          .collection('products')
          .doc(bidData.productId)
          .get();
          
        if (productSnapshot.exists()) {
          const productData = { 
            id: productSnapshot.id, 
            ...productSnapshot.data() 
          };
          bidData.productDetails = productData as any;
          console.log('Updated product details with stock:', (productData as any).stockQuantity);
        }
      } catch (err) {
        console.error('Failed to fetch product details for bid:', err);
      }
    }
    
    return bidData;
  } catch (error) {
    console.error('Error getting bid:', error);
    throw error;
  }
};

/**
 * Update an existing bid
 */
export const updateBid = async (bidId: string, bidData: Partial<Bid>) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to update a bid');
    }

    await firestore().collection('bids').doc(bidId).update({
      ...bidData,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    
    return { id: bidId, ...bidData };
  } catch (error) {
    console.error('Error updating bid:', error);
    throw error;
  }
};

/**
 * Delete a bid
 */
export const deleteBid = async (bidId: string) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to delete a bid');
    }

    await firestore().collection('bids').doc(bidId).delete();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting bid:', error);
    throw error;
  }
};

/**
 * Submit a bid offer from a buyer
 */
export const submitBidOffer = async (bidOfferId: Omit<BidOffer, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to submit a bid offer');
    }

    // First, get the bid to check stock availability
    const bidDoc = await firestore().collection('bids').doc(bidOfferId.bidId).get();
    if (!bidDoc.exists()) {
      throw new Error('Bid not found');
    }

    const bidData = bidDoc.data() as Bid;
    
    // If we have product details with stock info, validate quantity
    if (bidData.productDetails && bidData.productDetails.stockQuantity !== undefined) {
      if (bidOfferId.quantity > bidData.productDetails.stockQuantity) {
        throw new Error(`Cannot bid for more than the available stock (${bidData.productDetails.stockQuantity} units)`);
      }
    } else {
      // If bid doesn't have product details, fetch the product directly
      const productDoc = await firestore().collection('products').doc(bidOfferId.productId).get();
      if (productDoc.exists() && productDoc.data()?.stockQuantity !== undefined) {
        const stockQuantity = productDoc.data()?.stockQuantity;
        if (bidOfferId.quantity > stockQuantity) {
          throw new Error(`Cannot bid for more than the available stock (${stockQuantity} units)`);
        }
      }
    }

    const bidOfferWithTimestamps = {
      ...bidOfferId,
      buyerId: user.uid,
      status: 'pending',
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    const bidOfferRef = await firestore().collection('bidOffers').add(bidOfferWithTimestamps);
    
    // Update bid count
    const bidSnapshot = await firestore().collection('bids').doc(bidOfferId.bidId).get();
    
    if (bidSnapshot.exists()) {
      const bidData = bidSnapshot.data();
      const bidCount = bidData?.bidCount || 0;
      await firestore().collection('bids').doc(bidOfferId.bidId).update({ bidCount: bidCount + 1 });
    }
    
    return { id: bidOfferRef.id, ...bidOfferWithTimestamps };
  } catch (error) {
    console.error('Error submitting bid offer:', error);
    throw error;
  }
};

/**
 * Get bid offers for a specific bid
 */
export const getBidOffersByBidId = async (bidId: string) => {
  try {
    console.log('Fetching bid offers for bid:', bidId);
    const querySnapshot = await firestore()
      .collection('bidOffers')
      .where('bidId', '==', bidId)
      .orderBy('createdAt', 'desc')
      .get();
    
    console.log('Query results:', querySnapshot.size, 'documents found');
    
    const bidOffers = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Bid offer data:', data);
      return {
        id: doc.id,
        ...data,
      };
    }) as BidOffer[];

    return bidOffers;
  } catch (error) {
    console.error('Error getting bid offers:', error);
    throw error;
  }
};

/**
 * Get bid offers made by a buyer
 */
export const getBidOffersByBuyer = async (buyerId: string) => {
  try {
    const querySnapshot = await firestore()
      .collection('bidOffers')
      .where('buyerId', '==', buyerId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const bidOffers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as BidOffer[];

    return bidOffers;
  } catch (error) {
    console.error('Error getting bid offers:', error);
    throw error;
  }
};

/**
 * Update bid offer status (for seller to accept/reject)
 */
export const updateBidOfferStatus = async (bidOfferId: string, status: BidOffer['status']) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to update a bid offer');
    }

    await firestore().collection('bidOffers').doc(bidOfferId).update({
      status,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    
    return { id: bidOfferId, status };
  } catch (error) {
    console.error('Error updating bid offer status:', error);
    throw error;
  }
};

/**
 * Calculate recommended bid price for popular products without bids
 */
export const getRecommendedBidPrice = (product: Product): number => {
  // Calculate 10% off from half the quantity price
  if (!product || !product.stockQuantity || !product.basePrice) {
    return 0;
  }
  
  const halfQuantity = Math.ceil(product.stockQuantity / 2);
  const totalPrice = halfQuantity * product.basePrice;
  const discountedPrice = totalPrice * 0.9; // 10% off
  
  return Math.round(discountedPrice / halfQuantity); // Per piece price after discount
};

/**
 * Get the most popular products for bidding recommendations
 */
export const getPopularProductsForBidding = async (limit: number = 10) => {
  try {
    // Get products sorted by view count (if available)
    const querySnapshot = await firestore()
      .collection('products')
      .orderBy('viewCount', 'desc')
      .limit(limit * 2) // Fetch more than needed to account for filtering
      .get();
    
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      recommendedBidPrice: getRecommendedBidPrice(doc.data() as Product)
    })) as (Product & { recommendedBidPrice: number })[];

    return products.slice(0, limit);
  } catch (error) {
    console.error('Error getting popular products:', error);
    throw error;
  }
};

/**
 * Listen to real-time updates for a specific bid
 */
export const listenToBid = (bidId: string, callback: (bid: Bid) => void) => {
  return firestore()
    .collection('bids')
    .doc(bidId)
    .onSnapshot(snapshot => {
      if (snapshot.exists()) {
        const bidData = { id: snapshot.id, ...snapshot.data() } as Bid;
        callback(bidData);
      }
    });
};

/**
 * Listen to real-time updates for bid offers on a specific bid
 */
export const listenToBidOffers = (bidId: string, callback: (bidOffers: BidOffer[]) => void) => {
  return firestore()
    .collection('bidOffers')
    .where('bidId', '==', bidId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      const bidOffers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as BidOffer[];
      
      callback(bidOffers);
    });
};

/**
 * Increment product view count
 */
export const incrementProductViewCount = async (productId: string) => {
  try {
    const productDoc = firestore().collection('products').doc(productId);
    const productSnapshot = await productDoc.get();
    
    if (productSnapshot.exists()) {
      const productData = productSnapshot.data();
      const viewCount = productData?.viewCount || 0;
      
      await productDoc.update({
        viewCount: viewCount + 1,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      
      return { id: productId, viewCount: viewCount + 1 };
    }
    
    return null;
  } catch (error) {
    console.error('Error incrementing product view count:', error);
    throw error;
  }
};
