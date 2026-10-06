import { router } from 'expo-router';
import React from 'react';

import { Bar, Empty, Screen } from '../../components/ui';

/**
 * App blocking does not exist yet — it needs Android's usage-access
 * permission and, once granted, the real app list comes from
 * `UsageStatsManager` with icons from `packageManager.getApplicationIcon(pkg)`
 * at runtime. Until then this screen says so rather than showing an
 * invented list of apps the device was never asked to block, and rather
 * than drawing placeholder logos for apps it has no license to redraw.
 */
export default function AppPicker() {
  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Ilovalar" onBack={() => router.back()} />
      <Empty
        icon="lock"
        title="Ilovalarni bloklash uchun ruxsat kerak."
        body="Bu funksiya tez kunda qo'shiladi."
      />
    </Screen>
  );
}
