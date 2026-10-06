import { Stack } from 'expo-router';
import React from 'react';

import { color } from '../../design/tokens';

export default function CharityLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.page } }} />;
}
