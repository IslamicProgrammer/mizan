import {
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
  Onest_800ExtraBold,
  Onest_900Black,
  useFonts,
} from '@expo-google-fonts/onest';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getEnv } from '../data/env';
import { StoreProvider } from '../data/store';
import { color } from '../design/tokens';

export default function RootLayout() {
  // Fail here, naming the variable, rather than three screens later as a
  // confusing network error. Expo Router's error boundary shows the message.
  getEnv();

  // Onest carries the whole type system, including the 900-weight hero
  // numerals. Rendering before it loads causes a visible reflow, so hold.
  const [ready] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    Onest_800ExtraBold,
    Onest_900Black,
  });

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.page }}>
      <SafeAreaProvider>
        <StoreProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: color.page },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            {/* Full-screen moments: these take over the whole screen, so they
                present from the bottom rather than sliding in like a page. */}
            <Stack.Screen name="alarm" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="prayer-sheet" options={{ presentation: 'transparentModal', animation: 'fade' }} />
          </Stack>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
