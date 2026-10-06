import { Stack } from 'expo-router';
import React from 'react';

import { color } from '../../design/tokens';

export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.page } }} />;
}
