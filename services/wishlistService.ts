import firestore from '@react-native-firebase/firestore';

// Type definition for wishlist items
export interface WishlistItem {
  productId: string;
  name: string;
  basePrice: number;
  discountPrice?: number;
  featuredImage?: string;
  brand?: string;
  addedAt: Date | any; // Firestore timestamp
}

// Collection names
const WISHLIST_COLLECTION = 'wishlists';

/**
 * Check if a product is in the user's wishlist
 * @param userId User ID
 * @param productId Product ID
 * @returns Boolean indicating if product is in wishlist
 */
export const getWishlistStatus = async (userId: string, productId: string): Promise<boolean> => {
  try {
    const wishlistDoc = await firestore()
      .collection(WISHLIST_COLLECTION)
      .doc(userId)
      .collection('items')
      .doc(productId)
      .get();
      
    return wishlistDoc.exists();
  } catch (error) {
    console.error('Error checking wishlist status:', error);
    return false;
  }
};

/**
 * Add a product to the user's wishlist
 * @param userId User ID
 * @param product Product to add to wishlist
 */
export const addToWishlist = async (userId: string, product: WishlistItem): Promise<void> => {
  try {
    // Add product to user's wishlist subcollection
    await firestore()
      .collection(WISHLIST_COLLECTION)
      .doc(userId)
      .collection('items')
      .doc(product.productId)
      .set({
        ...product,
        addedAt: firestore.FieldValue.serverTimestamp()
      });

    // Update user's wishlist metadata if needed
    await firestore()
      .collection(WISHLIST_COLLECTION)
      .doc(userId)
      .set({
        updatedAt: firestore.FieldValue.serverTimestamp(),
        itemCount: firestore.FieldValue.increment(1)
      }, { merge: true });
      
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
};

/**
 * Remove a product from the user's wishlist
 * @param userId User ID
 * @param productId Product ID to remove
 */
export const removeFromWishlist = async (userId: string, productId: string): Promise<void> => {
  try {
    // Remove product from user's wishlist subcollection
    await firestore()
      .collection(WISHLIST_COLLECTION)
      .doc(userId)
      .collection('items')
      .doc(productId)
      .delete();
    
    // Update user's wishlist metadata
    await firestore()
      .collection(WISHLIST_COLLECTION)
      .doc(userId)
      .set({
        updatedAt: firestore.FieldValue.serverTimestamp(),
        itemCount: firestore.FieldValue.increment(-1)
      }, { merge: true });
      
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error;
  }
};

/**
 * Get all items in a user's wishlist
 * @param userId User ID
 * @returns Array of wishlist items
 */
export const getUserWishlist = async (userId: string): Promise<WishlistItem[]> => {
  try {
    const wishlistSnapshot = await firestore()
      .collection(WISHLIST_COLLECTION)
      .doc(userId)
      .collection('items')
      .orderBy('addedAt', 'desc')
      .get();
      
    return wishlistSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        productId: doc.id
      } as WishlistItem;
    });
  } catch (error) {
    console.error('Error getting wishlist:', error);
    return [];
  }
};

/**
 * Clear all items from a user's wishlist
 * @param userId User ID
 */
export const clearWishlist = async (userId: string): Promise<void> => {
  try {
    const batch = firestore().batch();
    
    // Get all items in the wishlist
    const wishlistSnapshot = await firestore()
      .collection(WISHLIST_COLLECTION)
      .doc(userId)
      .collection('items')
      .get();
    
    // Add delete operations to batch
    wishlistSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Execute batch
    await batch.commit();
    
    // Reset wishlist metadata
    await firestore()
      .collection(WISHLIST_COLLECTION)
      .doc(userId)
      .set({
        updatedAt: firestore.FieldValue.serverTimestamp(),
        itemCount: 0
      }, { merge: true });
      
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    throw error;
  }
};
