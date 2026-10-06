import { Stack } from 'expo-router';
import React from 'react';

/** The Fajr moment is full-screen and takes over; no headers, no swipe-back. */
export default function AlarmLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />;
}
