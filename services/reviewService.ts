import firestore from '@react-native-firebase/firestore';
import { getCurrentUser } from './authService';

// Get reviews for a product
export const getReviews = async (productId: string) => {
  try {
    const reviewsSnapshot = await firestore()
      .collection('reviews')
      .where('productId', '==', productId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
};

// Submit a review for a product
export const submitReview = async (productId: string, rating: number, review: string) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Check if user has already reviewed this product
    const existingReviewSnapshot = await firestore()
      .collection('reviews')
      .where('productId', '==', productId)
      .where('userId', '==', user.uid)
      .get();
    
    if (!existingReviewSnapshot.empty) {
      // Update existing review
      const reviewDoc = existingReviewSnapshot.docs[0];
      await reviewDoc.ref.update({
        rating,
        review,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      
      return reviewDoc.id;
    } else {
      // Create new review
      const reviewData = {
        productId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous User',
        userPhoto: user.photoURL || null,
        rating,
        review,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      
      const reviewRef = await firestore().collection('reviews').add(reviewData);
      
      // Update product average rating (optional - can be done with a cloud function instead)
      const allReviewsSnapshot = await firestore()
        .collection('reviews')
        .where('productId', '==', productId)
        .get();
      
      const allRatings = allReviewsSnapshot.docs.map(doc => doc.data().rating);
      const avgRating = allRatings.reduce((sum, curr) => sum + curr, 0) / allRatings.length;
      
      await firestore()
        .collection('products')
        .doc(productId)
        .update({
          avgRating,
          reviewCount: allRatings.length
        });
      
      return reviewRef.id;
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
};

// Delete a review
export const deleteReview = async (reviewId: string) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const reviewDoc = await firestore().collection('reviews').doc(reviewId).get();
    
    if (!reviewDoc.exists) {
      throw new Error('Review not found');
    }
    
    const reviewData = reviewDoc.data();
    
    if (reviewData?.userId !== user.uid) {
      throw new Error('Not authorized to delete this review');
    }
    
    await firestore().collection('reviews').doc(reviewId).delete();
    
    // Update product average rating
    const productId = reviewData?.productId;
    const allReviewsSnapshot = await firestore()
      .collection('reviews')
      .where('productId', '==', productId)
      .get();
    
    const allRatings = allReviewsSnapshot.docs.map(doc => doc.data().rating);
    const avgRating = allRatings.length > 0 
      ? allRatings.reduce((sum, curr) => sum + curr, 0) / allRatings.length
      : 0;
    
    await firestore()
      .collection('products')
      .doc(productId)
      .update({
        avgRating,
        reviewCount: allRatings.length
      });
      
    return true;
  } catch (error) {
    console.error('Error deleting review:', error);
    throw error;
  }
};