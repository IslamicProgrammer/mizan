import { Platform } from 'react-native';

import type { AppUsage, InstalledApp } from './src/AppWatch.types';

export type { AppUsage, InstalledApp };

/**
 * `requireNativeModule` throws synchronously the moment the native module
 * isn't linked -- true for every iOS build and for the web, since this is
 * deliberately an Android-only module (D3: `UsageStatsManager`, not
 * `AccessibilityService`). An import that throws leaves this whole file
 * half-evaluated, which is exactly how `expo-notifications` once took down
 * every screen in the app inside Expo Go: the root layout imported it,
 * import-time crashed, and the layout exported nothing. Loading the native
 * binding lazily, and only on Android, keeps that failure from ever
 * reaching here.
 */
interface AppWatchNative {
  hasUsageAccess(): boolean;
  requestUsageAccess(): void;
  hasOverlayPermission(): boolean;
  requestOverlayPermission(): void;
  foregroundPackage(): string | null;
  installedApps(): InstalledApp[];
  usageToday(): AppUsage[];
}

let native: AppWatchNative | null = null;
if (Platform.OS === 'android') {
  try {
    // A static `import` would be hoisted and evaluated on every platform
    // regardless of this guard, defeating the point of it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    native = require('./src/AppWatchModule').default as AppWatchNative;
  } catch {
    native = null;
  }
}

/** False on every platform but Android, and false there too until the user
 * grants the special-access toggle in Settings -- there is no runtime prompt
 * for this permission. */
export function hasUsageAccess(): boolean {
  return native?.hasUsageAccess() ?? false;
}

/** Opens the system settings screen; a no-op where there is nothing to open. */
export function requestUsageAccess(): void {
  native?.requestUsageAccess();
}

export function hasOverlayPermission(): boolean {
  return native?.hasOverlayPermission() ?? false;
}

export function requestOverlayPermission(): void {
  native?.requestOverlayPermission();
}

/** The package in front right now, or null when it can't be read. */
export function foregroundPackage(): string | null {
  return native?.foregroundPackage() ?? null;
}

/** Launchable apps only, never undefined -- callers can `.map` this safely
 * on every platform. */
export function installedApps(): InstalledApp[] {
  return native?.installedApps() ?? [];
}

export function usageToday(): AppUsage[] {
  return native?.usageToday() ?? [];
}
