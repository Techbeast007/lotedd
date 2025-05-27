import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ArrowRight } from "lucide-react-native";
import React from "react";
import { ScrollView } from "react-native";

type CardItem = {
  id: string;
  image: string;
  title: string;
  description: string;
  buttons: {
    label: string;
    onPress: () => void;
    variant?: "solid" | "outline";
  }[];
};

type HorizontalCardListProps = {
  heading: string;
  showIcon?: boolean;
  data: CardItem[];
};

export default function HorizontalCardList({
  heading,
  showIcon = false,
  data,
}: HorizontalCardListProps) {


  return (
<Box className="mb-8 px-4">
  <Box className="flex-row justify-between items-center mb-5">
    <Heading size="2xl" className=" font-bold text-typography-900">
      {heading}
    </Heading>
    {showIcon && (
      <Button
        onPress={() => console.log('Icon pressed')}
        className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center"
      >
        <ArrowRight  color="white" size={20} />
      </Button>
    )}
  </Box>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 4 }}
  >
    {data.map((item) => (
      <Card key={item.id} className="p-5 rounded-2xl w-[320px] mr-4 shadow-md bg-white">
        <Image
          source={{ uri: item.image }}
          className="mb-4 w-full h-[200px] rounded-lg"
          alt={item.title}
        />
        <Text className="text-sm font-semibold mb-2 text-typography-700">
          {item.title}
        </Text>
        <VStack className="mb-4">
          <Text size="md" className="text-typography-600 leading-snug">
            {item.description}
          </Text>
        </VStack>
        <Box className="flex-row flex-wrap gap-2">
          {item.buttons.map((btn, index) => (
            <Button
              key={index}
              onPress={btn.onPress}
              variant={btn.variant === "outline" ? "outline" : "solid"}
              className="px-4 py-2 flex-1 rounded-md"
            >
              <ButtonText
                size="sm"
                className={
                  btn.variant === "outline" ? "text-typography-600" : "text-white"
                }
              >
                {btn.label}
              </ButtonText>
            </Button>
          ))}
        </Box>
      </Card>
    ))}
  </ScrollView>
</Box>

  );
}
