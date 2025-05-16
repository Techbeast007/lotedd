import { Avatar, AvatarFallbackText, AvatarImage } from "@/components/ui/avatar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Drawer, DrawerBackdrop, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Icon, PhoneIcon, StarIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Home, LogOut, ShoppingCart, User, Wallet } from "lucide-react-native";
import React, { useEffect, useState } from "react";

export default function ProfileTab() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true); // Manage drawer state
  const router = useRouter();

  // Fetch user data from AsyncStorage
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const name = await AsyncStorage.getItem("name");
        const email = await AsyncStorage.getItem("email");
        const pic = await AsyncStorage.getItem("profilePicture");

        setUserName(name);
        setUserEmail(email);
        setProfilePic(pic);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  // Logout function
  const handleLogout = async () => {
    try {
      await AsyncStorage.clear(); // Clear all user data
      router.replace("/role-selection"); // Redirect to role-selection
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <Drawer
      isOpen={isDrawerOpen}
      closeOnOverlayClick={true} // Close the drawer when clicking outside
      onClose={() => setIsDrawerOpen(false)} // Close the drawer when clicking outside
    >
      <DrawerBackdrop />
      <DrawerContent className="w-[270px] md:w-[300px]">
        <DrawerHeader className="justify-center flex-col gap-2">
          <Avatar size="2xl">
            <AvatarFallbackText>User Image</AvatarFallbackText>
            <AvatarImage
              source={{
                uri: profilePic || "https://via.placeholder.com/150", // Fallback image
              }}
            />
          </Avatar>
          <VStack className="justify-center items-center">
            <Text size="lg">{userName || "Guest"}</Text>
            <Text size="sm" className="text-typography-600">
              {userEmail || "guest@example.com"}
            </Text>
          </VStack>
        </DrawerHeader>
        <Divider className="my-4" />
        <DrawerBody contentContainerClassName="gap-2">
          <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md">
            <Icon as={User} size="lg" className="text-typography-600" />
            <Text>My Profile</Text>
          </Pressable>
          <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md">
            <Icon as={Home} size="lg" className="text-typography-600" />
            <Text>Saved Address</Text>
          </Pressable>
          <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md">
            <Icon as={ShoppingCart} size="lg" className="text-typography-600" />
            <Text>Orders</Text>
          </Pressable>
          <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md">
            <Icon as={Wallet} size="lg" className="text-typography-600" />
            <Text>Saved Cards</Text>
          </Pressable>
          <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md">
            <Icon as={StarIcon} size="lg" className="text-typography-600" />
            <Text>Review App</Text>
          </Pressable>
          <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md">
            <Icon as={PhoneIcon} size="lg" className="text-typography-600" />
            <Text>Contact Us</Text>
          </Pressable>
        </DrawerBody>
        <DrawerFooter>
          <Button
            className="w-full gap-2"
            variant="outline"
            action="secondary"
            onPress={handleLogout}
          >
            <ButtonText>Logout</ButtonText>
            <ButtonIcon as={LogOut} />
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}