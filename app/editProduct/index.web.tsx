import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

const EditProduct = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // Get the product ID using Expo Router
  const [productName, setProductName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');

  useEffect(() => {
    // Fetch product data when component mounts
    if (id) {
      console.log('Fetching product with ID:', id);
      // Here you would normally fetch the product data from your database
      // For now we'll just log the ID
    }
  }, [id]);

  const handleSave = () => {
    // Logic to save the edited product details
    console.log('Product details saved for ID:', id);

    // Navigate back to the explore page after saving
    router.push('/(tabs)/explore');
  };

  return (
    <VStack className="flex-1 bg-gray-50 p-6">
      <Box className="p-6 bg-gradient-to-r from-blue-700 to-blue-500 rounded-xl mb-6">
        <Text className="text-2xl font-bold text-white">Edit Product</Text>
        <Text className="text-sm text-white opacity-90">Modify the details of your product below.</Text>
      </Box>

      <VStack className="space-y-4">
        <Text className="text-sm font-medium text-gray-700 ml-1">Product Name</Text>
        <Input>
          <InputSlot className="pl-3">
            <InputField
              placeholder="Product Name"
              value={productName}
              onChangeText={setProductName}
            />
          </InputSlot>
        </Input>

        <Text className="text-sm font-medium text-gray-700 ml-1">Short Description</Text>
        <Input>
          <InputSlot className="pl-3">
            <InputField
              placeholder="Short Description"
              value={shortDescription}
              onChangeText={setShortDescription}
            />
          </InputSlot>
        </Input>

        <Text className="text-sm font-medium text-gray-700 ml-1">Price</Text>
        <Input>
          <InputSlot className="pl-3">
            <InputField
              placeholder="Price"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </InputSlot>
        </Input>

        <Text className="text-sm font-medium text-gray-700 ml-1">Stock Quantity</Text>
        <Input>
          <InputSlot className="pl-3">
            <InputField
              placeholder="Stock Quantity"
              value={stockQuantity}
              onChangeText={setStockQuantity}
              keyboardType="numeric"
            />
          </InputSlot>
        </Input>
      </VStack>

      <Button
        onPress={handleSave}
        className="mt-6 bg-blue-600 rounded-lg py-3"
      >
        <ButtonText>Save Changes</ButtonText>
      </Button>
    </VStack>
  );
};

export default EditProduct;