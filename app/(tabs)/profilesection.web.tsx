import { Box } from "@/components/ui/box";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useRouter } from "expo-router";
import { LogOut, Pencil } from "lucide-react-native";
import { useState } from "react";

  
export default function ProfileSection() {

  const [currentUser, setCurrentUser] = useState(localStorage.getItem('currentRole') || null);
  const router = useRouter();


  const handleLogout = () => {
    localStorage.removeItem('user');
    // Router is already initialized at the top level
    router.push('/role-selection');
  };

  return (
    <>
    <Center className="w-full">
      <Box
      className=" mt-5 w-full mx-auto"
      >
      <Center className=" w-full p-5 h-[200px]">
        
        <Box className="relative">
          <Image
        source={{
          uri: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        }}
        size="lg"
        alt="image"
        style={{

          borderWidth: 8,
          borderColor: "white",
        }}
        className="rounded-full"
          />
          <Box className="absolute bottom-0 right-0 bg-white rounded-full p-1">
          <Pencil
        className="absolute bottom-0 right-0 bg-white rounded-full p-1"
        size={20}
        color="black"
          />

          </Box>
        </Box>
        <VStack className="justify-center items-center">
              <Text size="lg">User Name</Text>
              <Text size="sm" className="text-typography-600">
                abc@gmail.com
              </Text>
            </VStack>

      </Center>
      </Box>
    </Center>

<HStack className="w-full justify-between px-5 mt-5">
<Box className="w-full">
  <Text className="text-left font-bold" size="3xl">Personal Info</Text>
</Box>
</HStack>
<VStack className="w-full px-5 space-y-5 mt-10">
  <Box className="w-full flex flex-row justify-between items-center">
    <VStack>
      <Text className="text-left font-bold mt-4" size="xl">
        Name
      </Text>
      <Text className="text-left" size="lg">
        John Doe
      </Text>
    </VStack>
    <Pencil size={20} color="black" />
  </Box>
  <Box className="w-full h-[1px] bg-gray-300" />

  <Box className="w-full flex flex-row justify-between items-center mt-4">
    <VStack>
      <Text className="text-left font-bold" size="xl">
        Email
      </Text>
      <Text className="text-left" size="lg">
        john.doe@example.com
      </Text>
    </VStack>
    <Pencil size={20} color="black" />
  </Box>
  <Box className="w-full h-[1px] bg-gray-300 mt-4" />

  <Box className="w-full flex flex-row justify-between items-center mt-4">
    <VStack>
      <Text className="text-left font-bold" size="xl">
        Phone
      </Text>
      <Text className="text-left" size="lg">
        +1 234 567 890
      </Text>
    </VStack>
    <Pencil size={20} color="black" />
  </Box>
  <Box className="w-full h-[1px] bg-gray-300" />

  {currentUser === 'seller' && (
    <>
      <Box className="w-full flex flex-row justify-between items-center mt-4">
        <VStack>
          <Text className="text-left font-bold" size="xl">
            GST Number
          </Text>
          <Text className="text-left" size="lg">
            22AAAAA0000A1Z5
          </Text>
        </VStack>
        <Pencil size={20} color="black" />
      </Box>
      <Box className="w-full h-[1px] bg-gray-300" />
    </>
  )}


</VStack>
<Center className="w-full absolute bottom-10">
  <Box className="w-full flex flex-row justify-center items-center">
    <VStack>
      <Button
        className="w-full gap-2 bg-blue-500 color-white"
        variant="solid"
        action="secondary"
        size="xl"
        onPress={() => {
          handleLogout()
        }}
      >
        <ButtonText className="color-white">Logout</ButtonText>
        <ButtonIcon color="white" as={LogOut} />
      </Button>
    </VStack>
  </Box>
</Center>

</>

  );
}