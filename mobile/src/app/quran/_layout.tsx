import { Stack } from 'expo-router';
import React from 'react';

import { color } from '../../design/tokens';

export default function QuranLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.page } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[surah]" />
      {/* Same real native sheet as the root layout's `prayer-sheet` --
          see that screen's own comment for why this is a `formSheet`
          and not a transparent modal with a fade. */}
      <Stack.Screen
        name="reciter-sheet"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          sheetCornerRadius: 28,
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
