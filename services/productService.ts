import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from '@react-native-firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from '@react-native-firebase/storage';

// Get Firebase service instances
const firestore = getFirestore();
const storage = getStorage();

// Type definitions for better type safety
export interface Product {
  id?: string;
  name: string;
  basePrice: number;
  discountPrice?: number;
  description: string;
  category?: string;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
  featuredImage?: string;
  images?: string[];
  videos?: string[];
  ownerId?: string;
  sellerId?: string;
  stockQuantity: number;
  price?: number;
  discountedPrice?: number;
  discountPercentage?: number;
  freeShipping?: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt?: any; // Firestore timestamp
  updatedAt?: any; // Firestore timestamp
  brand?: string;
  color?: string;
  size?: string;
  weight?: string | number;
  dimensions?: string;
  measurements?: string;
  shortDescription?: string;
  status?: string;
  skuId?: string;
  duplicated?: boolean;
  originalDocId?: string;
  copyIndex?: number;
}

/**
 * Gets all products from Firestore
 * @returns Array of products
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    const productsCollection = collection(firestore, 'products');
    const productSnapshot = await getDocs(productsCollection);
    return productSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Product[];
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return empty array instead of throwing
    return [];
  }
};

/**
 * Adds a new product to Firestore
 */
export const addProduct = async (product: Product): Promise<string> => {
  try {
    const productsCollection = collection(firestore, 'products');
    const docRef = await addDoc(productsCollection, {
      ...product,
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

/**
 * Gets products by category
 */
export const getProductsByCategory = async (category: string): Promise<Product[]> => {
  try {
    const productsCollection = collection(firestore, 'products');
    const q = query(productsCollection, where('category', '==', category));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Product[];
  } catch (error) {
    console.error(`Error fetching products by category ${category}:`, error);
    return [];
  }
};

/**
 * Gets products by owner ID
 */
export const getProductsByOwnerId = async (ownerId: string): Promise<Product[]> => {
  try {
    const productsCollection = collection(firestore, 'products');
    const q = query(productsCollection, where('ownerId', '==', ownerId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Product[];
  } catch (error) {
    console.error(`Error fetching products by owner ${ownerId}:`, error);
    return [];
  }
};

/**
 * Gets a product by ID
 */
export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const productDoc = doc(firestore, 'products', productId);
    const productSnapshot = await getDoc(productDoc);
    
    if (productSnapshot.exists()) {
      return { 
        id: productSnapshot.id, 
        ...productSnapshot.data() 
      } as Product;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching product with ID ${productId}:`, error);
    return null;
  }
};

/**
 * Updates a product
 */
export const updateProduct = async (productId: string, productData: Partial<Product>): Promise<boolean> => {
  try {
    const productRef = doc(firestore, 'products', productId);
    await updateDoc(productRef, productData);
    return true;
  } catch (error) {
    console.error(`Error updating product ${productId}:`, error);
    return false;
  }
};

/**
 * Deletes a product
 */
export const deleteProduct = async (productId: string): Promise<boolean> => {
  try {
    const productRef = doc(firestore, 'products', productId);
    await deleteDoc(productRef);
    return true;
  } catch (error) {
    console.error(`Error deleting product ${productId}:`, error);
    return false;
  }
};

/**
 * Uploads an image to Firebase Storage and returns the download URL
 */
export const uploadProductImage = async (uri: string, productId: string): Promise<string> => {
  try {
    // Handle different URI formats between platforms
    const fetchResponse = await fetch(uri);
    const blob = await fetchResponse.blob();
    
    // Create a reference to the storage location
    const storageRef = ref(storage, `product-images/${productId}-${Date.now()}`);
    
    // Upload the blob to Firebase Storage
    const uploadTask = await uploadBytes(storageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(uploadTask.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Gets featured products 
 */
export const getFeaturedProducts = async (limit: number = 10): Promise<Product[]> => {
  try {
    const productsCollection = collection(firestore, 'products');
    const querySnapshot = await getDocs(productsCollection);
    const products = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Product[];
    console.log('Featured products:', products[0]);
    
    // Take the most recent products as featured products
    return products.slice(0, limit);
   
  } catch (error) {
    console.error('Error getting featured products:', error);
    return [];
  }
};

/**
 * Gets popular products
 */
export const getPopularProducts = async (limit: number = 10): Promise<Product[]> => {
  try {
    const productsCollection = collection(firestore, 'products');
    const querySnapshot = await getDocs(productsCollection);
    const products = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Product[];
    
    // In a real app, you might sort by popularity metrics
    // For now, just return some products
    return products.slice(0, limit);
  } catch (error) {
    console.error('Error getting popular products:', error);
    return [];
  }
};

/**
 * Fetches related products based on category
 * @param category - Product category to match
 * @param currentProductId - Current product ID to exclude from results
 * @param limit - Maximum number of products to return (default 5)
 */
export const getRelatedProducts = async (category: string, currentProductId: string, limitCount = 5) => {
  try {
    if (!category) {
      console.warn('No category provided for related products');
      return [];
    }

    const firestore = getFirestore();
    const productsRef = collection(firestore, 'products');
    
    // First approach: Get all products with the same category and filter out the current one
    try {
      const q = query(
        productsRef,
        where('category', '==', category)
      );
      
      const querySnapshot = await getDocs(q);
      let relatedProducts = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id !== currentProductId) {
          relatedProducts.push({
            id: doc.id,
            ...data,
          });
        }
      });
      
      // If we didn't get enough results, try with categoryName field instead
      if (relatedProducts.length < limitCount) {
        const altQuery = query(
          productsRef,
          where('categoryName', '==', category)
        );
        
        const additionalSnapshot = await getDocs(altQuery);
        additionalSnapshot.forEach((doc) => {
          if (doc.id !== currentProductId && !relatedProducts.some(p => p.id === doc.id)) {
            relatedProducts.push({
              id: doc.id,
              ...doc.data(),
            });
          }
        });
      }
      
      // Shuffle and limit results
      return relatedProducts
        .sort(() => 0.5 - Math.random())
        .slice(0, limitCount);
        
    } catch (error) {
      console.error('Error with query, falling back to simple approach:', error);
      
      // Fallback: get all products and filter manually
      const simpleQuery = query(productsRef);
      const querySnapshot = await getDocs(simpleQuery);
      
      let relatedProducts = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id !== currentProductId && 
           (data.category === category || data.categoryName === category)) {
          relatedProducts.push({
            id: doc.id,
            ...data,
          });
        }
      });
      
      return relatedProducts
        .sort(() => 0.5 - Math.random())
        .slice(0, limitCount);
    }
  } catch (error) {
    console.error('Error getting related products:', error);
    return [];
  }
};