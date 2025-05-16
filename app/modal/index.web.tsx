import { Button, ButtonText } from "@/components/ui/button";
import {
    Drawer,
    DrawerBackdrop,
    DrawerBody,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
} from "@/components/ui/drawer";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import React, { useEffect, useState } from "react";

export default function ProfileTab() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
    useEffect(() => {
      setIsDrawerOpen(true);
    }, []);
  
    const handleClose = () => {
      setIsDrawerOpen(false);
    };
  
    return (
      <>
        {/* Optional: A trigger to re-open drawer if needed */}
        <Button onPress={() => setIsDrawerOpen(true)}>
          <ButtonText>Open Profile Drawer</ButtonText>
        </Button>
  
        <Drawer isOpen={isDrawerOpen} onClose={handleClose} size="sm" anchor="left">
          <DrawerBackdrop />
          <DrawerContent className="w-[270px] md:w-[300px]">
            <DrawerHeader>
              <Heading size="xl">Profile</Heading>
            </DrawerHeader>
            <DrawerBody>
              <Text>This is your profile drawer inside tab</Text>
            </DrawerBody>
            <DrawerFooter>
              <Button onPress={handleClose}>
                <ButtonText>Close</ButtonText>
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }
  
