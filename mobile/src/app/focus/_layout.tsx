import { Stack } from 'expo-router';
import React from 'react';

import { color } from '../../design/tokens';

export default function FocusLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.page } }} />;
}
