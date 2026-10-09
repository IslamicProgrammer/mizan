import { NativeModule, requireNativeModule } from 'expo';

import type { AppUsage, InstalledApp } from './AppWatch.types';

declare class AppWatchModule extends NativeModule<{}> {
  hasUsageAccess(): boolean;
  requestUsageAccess(): void;
  hasOverlayPermission(): boolean;
  requestOverlayPermission(): void;
  foregroundPackage(): string | null;
  installedApps(): InstalledApp[];
  usageToday(): AppUsage[];
}

export default requireNativeModule<AppWatchModule>('AppWatch');
