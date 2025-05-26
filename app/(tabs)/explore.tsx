import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Checkbox, CheckboxGroup, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { Divider } from '@/components/ui/divider';
import { Drawer, DrawerBackdrop, DrawerBody, DrawerContent, DrawerHeader } from '@/components/ui/drawer';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { ScrollView } from '@/components/ui/scroll-view';
import { Slider, SliderFilledTrack, SliderThumb, SliderTrack } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableData, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, getFirestore, query, where } from '@react-native-firebase/firestore';
import { CheckIcon, SlidersHorizontal } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';


const Explore = () => {
  interface Product {
    id: string;
    skuId: string;
    name: string;
    categoryName: string;
    description: string;
    measurements: string;
    images?: string[];
  }

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number>(10000);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const firestore = getFirestore();
        const sellerId = await AsyncStorage.getItem('user'); // Fetch the logged-in seller's ID
        if (!sellerId) {
          console.error('Seller ID not found.');
          setIsLoading(false);
          return;
        }
  
        const productsRef = collection(firestore, 'products');
        const q = query(productsRef, where('sellerId', '==', sellerId));
        const querySnapshot = await getDocs(q);
  
        const fetchedProducts = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            skuId: data.skuId || '',
            name: data.name || '',
            categoryName: data.categoryName || '',
            description: data.description || '',
            measurements: data.measurements || '',
            images: data.images || [],
          };
        });
  
        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts); // Initialize filtered products
  
        // Extract unique categories
        const uniqueCategories: string[] = [
          ...new Set(fetchedProducts.map((product) => product.categoryName)),
        ];
        setCategories(uniqueCategories); // Set the categories dynamically
        setAvailableCategories(uniqueCategories); // Populate availableCategories
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchProducts();
  }, []);
  
  const applyFilters = () => {
    let filtered = [...products]; // Start with all products
  
    // Filter by categories
    if (categories.length > 0) {
      filtered = filtered.filter((product) => categories.includes(product.categoryName));
    }
  
    // Filter by price range (assuming price is part of the product data)
    filtered = filtered.filter((product) => {
      const price = parseInt(product.measurements.replace(/\D/g, ''), 10) || 0; // Extract numeric value from measurements
      return price <= priceRange;
    });
  
    setFilteredProducts(filtered); // Update the filtered products
    setShowDrawer(false); // Close the drawer after applying filters
  };

  return (
    <>
          <VStack className="flex-1 bg-gray-50">
            
            {/* Hero Section */}
            <Box
  className="h-60 rounded-b-lg flex flex-col justify-end items-start p-10 bg-blue-700">
  <Text className="text-4xl font-bold text-white mb-2">Explore Products</Text>
  <Text className="text-lg text-white opacity-90">
    Discover and manage your product catalog effortlessly.
  </Text>
</Box>
      <HStack className="mb-4 justify-between p-4" >
        <Text className="text-gray-600 text-sm mb-2">Use the filters to narrow down your product search.</Text>
        <SlidersHorizontal  onPress={() => {
          setShowDrawer(true);
        }}/>
      </HStack>
     

      {/* Filter Drawer */}
      <Drawer isOpen={showDrawer} onClose={() => setShowDrawer(false)}>
  <DrawerBackdrop />
  <DrawerContent className="flex flex-col h-full w-[280px] md:w-[400px] px-5 pt-6 pb-4 bg-white rounded-t-2xl">
    
    {/* Header */}
    <DrawerHeader className="mt-20">
      <Heading size="lg" className="text-xl font-semibold text-gray-900">
        Filters
      </Heading>
    </DrawerHeader>

    {/* Scrollable Filter Body */}
    <DrawerBody className="flex-1 overflow-y-auto pr-1 space-y-6">
      
      {/* Categories */}
      <VStack className='m-4'>
        <Text className="text-base font-medium text-gray-800">Categories</Text>
        <Divider className="my-2" />
        <CheckboxGroup value={categories} onChange={setCategories}>
          <VStack className="gap-3 mt-1 ml-1">
            {availableCategories.map((category) => (
              <Checkbox
                key={category}
                value={category}
                size="sm"
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              >
                <CheckboxIndicator className="text-white">
                  <CheckboxIcon as={CheckIcon} />
                </CheckboxIndicator>
                <CheckboxLabel className="ml-2 text-sm text-gray-700">{category}</CheckboxLabel>
              </Checkbox>
            ))}
          </VStack>
        </CheckboxGroup>
      </VStack>

      {/* Price Range */}
      <VStack className='m-4'>
        <Text className="text-base font-medium text-gray-800">Price Range</Text>
        <Divider className="my-2" />
        <VStack className="pt-4 pr-4 ml-1">
          <Slider
            value={priceRange}
            onChange={setPriceRange}
            size="sm"
            orientation="horizontal"
            minValue={0}
            maxValue={10000}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </VStack>
        <HStack className="justify-between pt-2 px-1">
          <Text size="sm" className="text-gray-500">0</Text>
          <Text size="sm" className="text-gray-500">10,000</Text>
        </HStack>
      </VStack>
    </DrawerBody>

    {/* Footer Buttons */}
    <Box className="space-y-2 px-1 pt-3 border-t border-gray-200">
      <Button
        onPress={applyFilters}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-4"
      >
        <ButtonText>Apply Filters</ButtonText>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onPress={() => {
          setCategories([]);
          setBrands([]);
          setPriceRange(10000);
          setFilteredProducts(products);
        }}
        className="w-full border-gray-300 text-gray-700" 
      >
        <ButtonText>Clear All</ButtonText>
      </Button>
    </Box>
  </DrawerContent>
</Drawer>



      {/* Product Table */}
      <Box className="w-full max-w-screen overflow-auto">
        {isLoading ? (
          <Spinner className="m-auto" />
        ) : (
          <ScrollView horizontal className="w-full">
            <Box className="min-w-[1000px] min-h-[1000px] lg:min-w-full">
              <Table className="border-collapse border border-gray-200">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-bold border border-gray-200 px-4 py-2 text-left">SKU ID</TableHead>
                    <TableHead className="border border-gray-200 px-4 py-2 text-left">Product Name</TableHead>
                    <TableHead className="border border-gray-200 px-4 py-2 text-left">Category</TableHead>
                    <TableHead className="border border-gray-200 px-4 py-2 text-left">Description</TableHead>
                    <TableHead className="border border-gray-200 px-4 py-2 text-left">Measurements</TableHead>
                    <TableHead className="border border-gray-200 px-4 py-2 text-left">Images</TableHead>
                    <TableHead className="border border-gray-200 px-4 py-2 text-left">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50">
                      <TableData className="border border-gray-200 px-4 py-2">{product.skuId}</TableData>
                      <TableData className="border border-gray-200 px-4 py-2">{product.name}</TableData>
                      <TableData className="border border-gray-200 px-4 py-2">{product.categoryName}</TableData>
                      <TableData className="border border-gray-200 px-4 py-2">{product.description}</TableData>
                      <TableData className="border border-gray-200 px-4 py-2">{product.measurements}</TableData>
                      <TableData className="border border-gray-200 px-4 py-2">
                        {product.images?.length > 0 ? (
                          <Badge size="sm" action="info" className="w-fit justify-center">
                            <BadgeText>{product.images.length} Images</BadgeText>
                          </Badge>
                        ) : (
                          'No Images'
                        )}
                      </TableData>
                      <TableData className="border border-gray-200 px-4 py-2">
                        <Badge size="sm" action="success" className="w-fit justify-center">
                          <BadgeText>Active</BadgeText>
                        </Badge>
                      </TableData>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </ScrollView>
        )}
      </Box>
      </VStack>
    </>
  );
};

export default Explore;