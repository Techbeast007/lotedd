import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Button,
  ButtonIcon,
  ButtonText,
} from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import {
  Drawer,
  DrawerBackdrop,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Icon, PhoneIcon, StarIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  Home,
  LogOut,
  ShoppingCart,
  User,
  Wallet,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";

interface ProfileTabProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileTab({ visible, onClose }: ProfileTabProps) {
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const router = useRouter();

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

  const handleLogout = async () => {
    try {
      await localStorage.clear();
      onClose(); // Close drawer before redirect
      router.replace("/role-selection");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <Drawer isOpen={visible} onClose={onClose}>
      <DrawerBackdrop />
      <DrawerContent className="w-[270px] md:w-[300px]">
        <DrawerHeader className="justify-center flex-col gap-2">
          <Avatar size="2xl">
            <AvatarFallbackText>User Image</AvatarFallbackText>
            <AvatarImage
              source={{
                uri: profilePic || "https://via.placeholder.com/150",
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
          {[
            { icon: User, label: "My Profile" },
            { icon: Home, label: "Saved Address" },
            { icon: ShoppingCart, label: "Orders" },
            { icon: Wallet, label: "Saved Cards" },
            { icon: StarIcon, label: "Review App" },
            { icon: PhoneIcon, label: "Contact Us" },
          ].map(({ icon, label }, index) => (
            <Pressable
              key={index}
              className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md"
            >
              <Icon as={icon} size="lg" className="text-typography-600" />
              <Text>{label}</Text>
            </Pressable>
          ))}
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
