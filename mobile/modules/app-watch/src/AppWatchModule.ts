import { NativeModule, requireNativeModule } from 'expo';

import type { AppUsage, BlockMode, InstalledApp } from './AppWatch.types';

declare class AppWatchModule extends NativeModule<{}> {
  hasUsageAccess(): boolean;
  requestUsageAccess(): void;
  hasOverlayPermission(): boolean;
  requestOverlayPermission(): void;
  foregroundPackage(): string | null;
  installedApps(): InstalledApp[];
  appIcon(pkg: string): string | null;
  usageToday(): AppUsage[];
  startFocus(blocked: string[], endsAt: number, mode: BlockMode): void;
  stopFocus(): void;
  isFocusRunning(): boolean;
}

export default requireNativeModule<AppWatchModule>('AppWatch');
