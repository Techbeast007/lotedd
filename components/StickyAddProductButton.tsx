import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React from 'react';

const StickyAddProductButton = () => {
  const router = useRouter();

  const handleNavigateToAddProduct = () => {
    router.push('/productadd'); // Navigate to the Add Product page
  };

  return (
    <Box
      className="absolute bottom-5 right-5"
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
      }}
    >
      <Button
        className="w-14 h-14 bg-blue-500 rounded-full shadow-lg flex items-center justify-center"
        onPress={handleNavigateToAddProduct}
      >
        <Plus size={24} color="white" />
      </Button>
    </Box>
  );
};

export default StickyAddProductButton;