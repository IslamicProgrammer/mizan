import { Stack } from 'expo-router';
import React from 'react';

/** Just a group for `/sign-in` — no chrome of its own, same as `(tabs)`'s
 * sibling groups. The root layout already sets the page background and
 * hides headers for every screen. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
