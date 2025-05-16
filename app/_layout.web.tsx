'use client';

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { Slot } from 'expo-router';

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <Slot />
    </GluestackUIProvider>
  );
}
