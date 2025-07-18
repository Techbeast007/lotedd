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
  viewCount?: number; // Track number of product views
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
  mrp?: number; // Maximum Retail Price
  specifications?: Record<string, string>; // Product specifications
  wishlistedBy?: string[]; // List of user IDs who have wishlisted this product
  
  // New fields for seller product management
  manufacturingCost?: number; // Cost per piece to manufacture
  sellingPricePerPiece?: number; // Selling price per piece
  wholeStockPrice?: number; // Optional price for the entire stock
  
  // New fields added for enhanced product details
  moq?: number; // Minimum Order Quantity
  condition?: 'new' | 'used' | 'refurbished'; // Product condition
  damagePercentage?: number; // Percentage of damage (for used/refurbished products)
}

/**
 * Gets all products from Firestore
 * @returns Array of products
 */
/**
 * Maps between category IDs and names based on a predefined list
 * This helps with category filtering
 */
export const getCategoryMapping = (): Record<string, string> => {
  const categoryMap: Record<string, string> = {
    '1': 'Electronics',
    '2': 'Fashion',
    '3': 'Home Appliances',
    '4': 'Books',
    '5': 'Toys',
    '6': 'Sports',
    '7': 'Beauty & Personal Care',
    '8': 'Automotive',
    '9': 'Groceries',
    '10': 'Art'
  };
  
  return categoryMap;
};

export const getProducts = async (): Promise<Product[]> => {
  try {
    console.log('Attempting to fetch products from Firestore...');
    const productsCollection = collection(firestore, 'products');
    const productSnapshot = await getDocs(productsCollection);
    
    console.log(`Retrieved ${productSnapshot.docs.length} products from Firestore`);
    
    if (productSnapshot.docs.length === 0) {
      console.warn('No products found in Firestore! You may need to add some test data.');
    }
    
    // Get products and add category names if missing
    const categoryMap = getCategoryMapping();
    const products = productSnapshot.docs.map(doc => {
      const data = doc.data();
      const product = { 
        id: doc.id, 
        ...data 
      } as Product;
      
      // If product has categoryId but no category name, add it
      if (product.categoryId && !product.category && categoryMap[product.categoryId]) {
        product.category = categoryMap[product.categoryId];
      }
      
      return product;
    });
    
    return products;
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
 * @param category - Can be either a category string name or category ID
 */
export const getProductsByCategory = async (category: string): Promise<Product[]> => {
  try {
    const productsCollection = collection(firestore, 'products');
    let products: Product[] = [];
    
    // Try fetching by category name first
    let q = query(productsCollection, where('category', '==', category));
    let querySnapshot = await getDocs(q);
    
    // If no results, try by categoryId (if category parameter is numeric)
    if (querySnapshot.empty && !isNaN(Number(category))) {
      q = query(productsCollection, where('categoryId', '==', category));
      querySnapshot = await getDocs(q);
      
      // If still no results, try categoryId as a string (some databases store IDs as strings)
      if (querySnapshot.empty) {
        q = query(productsCollection, where('categoryId', '==', Number(category)));
        querySnapshot = await getDocs(q);
      }
    }
    
    // If still no results, try by categoryName as a fallback
    if (querySnapshot.empty && isNaN(Number(category))) {
      q = query(productsCollection, where('categoryName', '==', category));
      querySnapshot = await getDocs(q);
    }
    
    products = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Product[];
    
    console.log(`Found ${products.length} products for category ${category}`);
    return products;
  } catch (error) {
    console.error(`Error fetching products by category ${category}:`, error);
    return [];
  }
};

/**
 * Gets products by owner ID or seller ID
 * Handles cases where sellerId might be the userId or a stringified object containing uid
 */
export const getProductsByOwnerId = async (ownerId: string): Promise<Product[]> => {
  try {
    console.log(`Fetching products for owner/seller ID: ${ownerId}`);
    
    const productsCollection = collection(firestore, 'products');
    let allProducts: Product[] = [];
    
    // First, try with ownerId
    const ownerQuery = query(productsCollection, where('ownerId', '==', ownerId));
    const ownerSnapshot = await getDocs(ownerQuery);
    
    if (!ownerSnapshot.empty) {
      console.log(`Found ${ownerSnapshot.docs.length} products with matching ownerId`);
      const ownerProducts = ownerSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Product[];
      allProducts = [...ownerProducts];
    }
    
    // Then try with sellerId as direct match
    const sellerQuery = query(productsCollection, where('sellerId', '==', ownerId));
    const sellerSnapshot = await getDocs(sellerQuery);
    
    if (!sellerSnapshot.empty) {
      console.log(`Found ${sellerSnapshot.docs.length} products with matching sellerId`);
      const sellerProducts = sellerSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Product[];
      
      // Add any products not already in the list
      sellerProducts.forEach(product => {
        if (!allProducts.some(p => p.id === product.id)) {
          allProducts.push(product);
        }
      });
    }
    
    // Always check for products with serialized seller objects, regardless of previous results
    console.log('Checking for products with serialized seller objects...');
    
    // Get all products and filter manually - we need to check all products for JSON string sellerId
    const allProductsQuery = query(productsCollection);
    const allProductsSnapshot = await getDocs(allProductsQuery);
    
    console.log(`Total number of products in database: ${allProductsSnapshot.docs.length}`);
    
    // Check each product individually and log detailed debug info
    const filteredProducts: Product[] = [];
    
    for (const doc of allProductsSnapshot.docs) {
      const data = doc.data();
      const productId = doc.id;
      
      // Skip products we already found by direct id match
      if (allProducts.some(p => p.id === productId)) {
        continue;
      }
      
      // If sellerId exists and is a string
      if (typeof data.sellerId === 'string') {
        const sellerIdStr = data.sellerId;
        
        // Log for debugging
        if (sellerIdStr.includes(ownerId)) {
          console.log(`Product ${productId} has sellerId containing the target ID: ${sellerIdStr.substring(0, 50)}...`);
        }
        
        // Check if it's a JSON string
        if (sellerIdStr.startsWith('{') || sellerIdStr.includes('"uid"') || sellerIdStr.includes("'uid'")) {
          try {
            // Try parsing as JSON
            const sellerObj = JSON.parse(sellerIdStr);
            
            // Compare the uid field
            if (sellerObj.uid === ownerId) {
              console.log(`Found product ${productId} with matching JSON sellerId.uid`);
              filteredProducts.push({
                id: productId,
                ...data
              } as Product);
            }
          } catch {
            // Not valid JSON, but still check if it contains the ID
            if (sellerIdStr.includes(ownerId)) {
              console.log(`Product ${productId} contains the owner ID, but is not valid JSON: ${sellerIdStr.substring(0, 20)}...`);
              filteredProducts.push({
                id: productId,
                ...data
              } as Product);
            }
          }
        }
        // If it's not JSON-like but contains the ID exactly
        else if (sellerIdStr === ownerId) {
          console.log(`Product ${productId} has exact sellerId match`);
          filteredProducts.push({
            id: productId,
            ...data
          } as Product);
        }
      }
    }
      
      if (filteredProducts.length > 0) {
        console.log(`Found ${filteredProducts.length} products with serialized seller objects`);
        
        // Add any products not already in the list
        filteredProducts.forEach(product => {
          if (!allProducts.some(p => p.id === product.id)) {
            allProducts.push(product);
          }
        });
      }
    
    console.log(`Total unique products found: ${allProducts.length}`);
    return allProducts;
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
    console.log(`Fetching product with ID: ${productId}`);
    const productDoc = doc(firestore, 'products', productId);
    const productSnapshot = await getDoc(productDoc);
    
    if (productSnapshot.exists()) {
      const productData = productSnapshot.data();
      // Ensure images and videos are arrays if they exist
      const product = { 
        id: productSnapshot.id, 
        ...productData,
        images: productData.images || [],
        videos: productData.videos || []
      } as Product;
      
      console.log(`Successfully fetched product: ${product.name}`);
      console.log(`Product images: ${JSON.stringify(product.images)}`);
      console.log(`Product featured image: ${product.featuredImage}`);
      console.log(`Product videos: ${JSON.stringify(product.videos)}`);
      
      return product;
    }
    console.log(`Product with ID ${productId} not found`);
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
    console.log('Attempting to fetch featured products...');
    const productsCollection = collection(firestore, 'products');
    const querySnapshot = await getDocs(productsCollection);
    
    console.log(`Retrieved ${querySnapshot.docs.length} products for featured selection`);
    
    // Get category mapping
    const categoryMap = getCategoryMapping();
    
    // Process products and add category names if missing
    const products = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const product = { 
        id: doc.id, 
        ...data 
      } as Product;
      
      // If product has categoryId but no category name, add it
      if (product.categoryId && !product.category && categoryMap[String(product.categoryId)]) {
        product.category = categoryMap[String(product.categoryId)];
      }
      
      return product;
    });
    
    if (products.length > 0) {
      console.log('First featured product:', products[0].name, products[0].id);
      console.log('Category info:', products[0].category, products[0].categoryId);
    } else {
      console.warn('No featured products found - your Firestore collection may be empty');
      
      // Create a placeholder product for debugging
      const placeholderProducts: Product[] = Array(limit).fill(null).map((_, i) => ({
        id: `placeholder-${i}`,
        name: `Placeholder Product ${i+1}`,
        description: 'This is a placeholder product because no products were found in your database.',
        basePrice: 999,
        discountPrice: 799,
        stockQuantity: 10,
        categoryId: String(i % 10 + 1), // Assign different category IDs
        category: categoryMap[String(i % 10 + 1)], // Assign matching categories
        featuredImage: 'https://via.placeholder.com/800x400?text=No+Products+Found'
      }));
      
      console.log('Created placeholder products for UI testing');
      return placeholderProducts;
    }
    
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
    console.log('Attempting to fetch popular products...');
    const productsCollection = collection(firestore, 'products');
    const querySnapshot = await getDocs(productsCollection);
    
    console.log(`Retrieved ${querySnapshot.docs.length} products for popular selection`);
    
    // Get category mapping
    const categoryMap = getCategoryMapping();
    
    // Process products and add category names if missing
    const products = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const product = { 
        id: doc.id, 
        ...data 
      } as Product;
      
      // If product has categoryId but no category name, add it
      if (product.categoryId && !product.category && categoryMap[String(product.categoryId)]) {
        product.category = categoryMap[String(product.categoryId)];
      }
      
      return product;
    });
    
    if (products.length > 0) {
      console.log('First popular product:', products[0].name, products[0].id);
      console.log('Popular product category info:', products[0].category, products[0].categoryId);
      
      // In a real app, you might sort by popularity metrics
      return products.slice(0, limit);
    } else {
      console.warn('No popular products found - your Firestore collection may be empty');
      
      // Create placeholder products for testing UI
      const placeholderProducts: Product[] = Array(limit).fill(null).map((_, i) => ({
        id: `popular-${i}`,
        name: `Popular Item ${i+1}`,
        description: 'This is a placeholder popular product because no products were found in your database.',
        basePrice: 1299,
        discountPrice: 999,
        stockQuantity: 5,
        categoryId: String((i + 5) % 10 + 1), // Different category IDs than featured
        category: categoryMap[String((i + 5) % 10 + 1)], // Assign matching categories
        featuredImage: 'https://via.placeholder.com/800x400?text=Popular+Product'
      }));
      
      console.log('Created placeholder popular products for UI testing');
      return placeholderProducts;
    }
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
export const getRelatedProducts = async (category: string, currentProductId: string, limitCount = 5): Promise<Product[]> => {
  try {
    if (!category) {
      console.warn('No category provided for related products');
      return [];
    }

    const firestore = getFirestore();
    const productsRef = collection(firestore, 'products');
    const categoryMap = getCategoryMapping();
    let relatedProducts: Product[] = [];

    try {
      // Try to match by both name and ID
      const isNumericCategory = !isNaN(Number(category));

      // 1. Try by category name
      let q = query(productsRef, where('category', '==', category));
      let querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id !== currentProductId) {
          const product = {
            id: doc.id,
            ...data,
          } as Product;
          if (product.categoryId && !product.category && categoryMap[String(product.categoryId)]) {
            product.category = categoryMap[String(product.categoryId)];
          }
          relatedProducts.push(product);
        }
      });

      if (relatedProducts.length >= limitCount) {
        return relatedProducts.slice(0, limitCount);
      }

      // 2. If not enough results, try by category ID (numeric)
      if (relatedProducts.length < limitCount && isNumericCategory) {
        q = query(productsRef, where('categoryId', '==', category));
        querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== currentProductId) {
            const product = {
              id: doc.id,
              ...data,
            } as Product;
            if (product.categoryId && !product.category && categoryMap[String(product.categoryId)]) {
              product.category = categoryMap[String(product.categoryId)];
            }
            relatedProducts.push(product);
          }
        });
      }

      if (relatedProducts.length >= limitCount) {
        return relatedProducts.slice(0, limitCount);
      }

      // 3. If still not enough, try by category ID (string)
      if (relatedProducts.length < limitCount) {
        q = query(productsRef, where('categoryId', '==', Number(category)));
        querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== currentProductId) {
            const product = {
              id: doc.id,
              ...data,
            } as Product;
            if (product.categoryId && !product.category && categoryMap[String(product.categoryId)]) {
              product.category = categoryMap[String(product.categoryId)];
            }
            relatedProducts.push(product);
          }
        });
      }

      if (relatedProducts.length >= limitCount) {
        return relatedProducts.slice(0, limitCount);
      }

      // 4. As a last resort, try by categoryName
      if (relatedProducts.length < limitCount) {
        q = query(productsRef, where('categoryName', '==', category));
        querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== currentProductId) {
            const product = {
              id: doc.id,
              ...data,
            } as Product;
            if (product.categoryId && !product.category && categoryMap[String(product.categoryId)]) {
              product.category = categoryMap[String(product.categoryId)];
            }
            relatedProducts.push(product);
          }
        });
      }

      return relatedProducts.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching related products:', error);
      return [];
    }
  } catch (error) {
    console.error('Error in getRelatedProducts:', error);
    return [];
  }
};

/**
 * Gets products with low stock (below the specified threshold)
 * @param threshold - The stock threshold (default: 200)
 * @param sellerId - Optional seller ID to filter by
 * @returns Promise with an array of low stock products
 */
export const getLowStockProducts = async (threshold = 200, sellerId?: string): Promise<Product[]> => {
  try {
    console.log(`Fetching products with stock below ${threshold}`);
    const productsCollection = collection(firestore, 'products');
    
    // Start with getting all products
    let querySnapshot;
    
    if (sellerId) {
      // If seller ID is provided, filter by seller ID
      const q = query(productsCollection, where('sellerId', '==', sellerId));
      querySnapshot = await getDocs(q);
      
      // If no results, try with ownerId
      if (querySnapshot.empty) {
        const ownerQuery = query(productsCollection, where('ownerId', '==', sellerId));
        querySnapshot = await getDocs(ownerQuery);
      }
    } else {
      // Otherwise get all products
      querySnapshot = await getDocs(productsCollection);
    }
    
    // Filter products with stock below threshold
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
    
    const lowStockProducts = products.filter(product => 
      product.stockQuantity !== undefined && 
      product.stockQuantity < threshold
    );
    
    console.log(`Found ${lowStockProducts.length} products with low stock`);
    return lowStockProducts;
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    return [];
  }
};