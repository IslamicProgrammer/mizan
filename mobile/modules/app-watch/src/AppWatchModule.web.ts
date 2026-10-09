import { registerWebModule, NativeModule } from 'expo';

import type { AppUsage, InstalledApp } from './AppWatch.types';

/**
 * `UsageStatsManager` is an Android-only API, so the web build has nothing
 * real to report. These stubs exist for the rare case something imports this
 * file directly rather than going through the platform-gated barrel at the
 * module root -- they must stay inert, never throw.
 */
class AppWatchModule extends NativeModule<{}> {
  hasUsageAccess(): boolean {
    return false;
  }
  requestUsageAccess(): void {}
  hasOverlayPermission(): boolean {
    return false;
  }
  requestOverlayPermission(): void {}
  foregroundPackage(): string | null {
    return null;
  }
  installedApps(): InstalledApp[] {
    return [];
  }
  usageToday(): AppUsage[] {
    return [];
  }
  startFocus(_blocked: string[], _endsAt: number): void {}
  stopFocus(): void {}
  isFocusRunning(): boolean {
    return false;
  }
}

export default registerWebModule(AppWatchModule, 'AppWatchModule');
