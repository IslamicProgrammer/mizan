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
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { syncFajrAlarm } from '../data/alarm';
import { getEnv } from '../data/env';
import { syncNotifications } from '../data/notify';
import { StoreProvider, useStore } from '../data/store';
import { color } from '../design/tokens';

/**
 * Keeps the device's pending alarms matching the user's own settings. The
 * effect's dependency list is the three fields that change what should be
 * scheduled — madhhab shifts Asr, `notifyBefore` shifts every lead time, and
 * `cycleMode` turns the whole feature off — rather than `settings` itself,
 * so marking a prayer or opening the garden does not re-touch the OS alarm
 * list on every render. The same call also covers "schedule on launch":
 * mounting this component is itself a change from no-effect-ran to
 * effect-ran, so the window is rebuilt the first time just as it is on any
 * later settings change.
 */
function NotificationSync() {
  const { settings } = useStore();
  useEffect(() => {
    syncNotifications(settings).catch(() => {
      // A scheduling failure (denied permission, a flaky OS call) must never
      // surface as a crash or a blocked screen — the rest of the app works
      // identically whether or not the alarms went in.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.madhhab, settings.notifyBefore, settings.cycleMode]);
  return null;
}

/**
 * Keeps the single native Fajr alarm matching `fajrAlarm` and `madhhab` --
 * mounting this is itself "app start", so the real alarm is also what
 * `AlarmReceiver`'s own reschedule (an approximation, see `FajrAlarmTime.kt`)
 * gets corrected against the moment the app is next opened, which is
 * exactly the moment the user dismisses today's alarm.
 */
function FajrAlarmSync() {
  const { settings } = useStore();
  useEffect(() => {
    try {
      syncFajrAlarm(settings);
    } catch {
      // A native call failing (odd OEM behaviour, no module) must never
      // crash the app the alarm exists to protect.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.fajrAlarm, settings.madhhab]);
  return null;
}

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
          <NotificationSync />
          <FajrAlarmSync />
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
