import { NativeModule, requireNativeModule } from 'expo';

import type { AppUsage, InstalledApp } from './AppWatch.types';

declare class AppWatchModule extends NativeModule<{}> {
  hasUsageAccess(): boolean;
  requestUsageAccess(): void;
  hasOverlayPermission(): boolean;
  requestOverlayPermission(): void;
  foregroundPackage(): string | null;
  installedApps(): InstalledApp[];
  appIcon(pkg: string): string | null;
  usageToday(): AppUsage[];
  startFocus(blocked: string[], endsAt: number): void;
  stopFocus(): void;
  isFocusRunning(): boolean;
}

export default requireNativeModule<AppWatchModule>('AppWatch');
