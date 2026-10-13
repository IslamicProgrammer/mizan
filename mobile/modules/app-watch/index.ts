import { Platform } from 'react-native';

import type { AppUsage, BlockMode, InstalledApp } from './src/AppWatch.types';

export type { AppUsage, BlockMode, InstalledApp };

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
  appIcon(pkg: string): string | null;
  usageToday(): AppUsage[];
  startFocus(blocked: string[], endsAt: number, mode: BlockMode): void;
  stopFocus(): void;
  isFocusRunning(): boolean;
  scheduleFajrAlarm(atEpochMs: number): void;
  scheduleTestAlarm(atEpochMs: number): void;
  cancelFajrAlarm(): void;
  canScheduleExact(): boolean;
  requestExactAlarmPermission(): void;
  nextFajrAlarmAt(): number | null;
  stopAlarmSound(): void;
  isIgnoringBatteryOptimizations(): boolean;
  requestIgnoreBatteryOptimizations(): void;
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

/** One icon as a base64 PNG data URI, or null when it can't be decoded, or
 * on any platform without the module -- callers must fall back to a
 * neutral letter tile rather than drawing a stand-in for a real brand's
 * mark. Cached natively per package for the process lifetime, so calling
 * this again for a row that already resolved is nearly free. */
export function appIcon(pkg: string): string | null {
  return native?.appIcon(pkg) ?? null;
}

export function usageToday(): AppUsage[] {
  return native?.usageToday() ?? [];
}

/**
 * Starts (or restarts) the reminder/lock service for this session:
 * `blocked` is the package list it watches for, `endsAt` the
 * epoch-millisecond time it must stop itself at. Passing
 * `Number.MAX_SAFE_INTEGER` is how the test switch in focus/apps.tsx asks
 * it to run with no end time -- the service tells that apart from a real
 * session by how far in the future it is, not by a second parameter, so
 * there is exactly one code path that starts it.
 *
 * `mode` is task 23's addition, defaulting to `'remind'` when omitted --
 * the compatibility promise that keeps every call site written before
 * lock mode existed (`focus/active.tsx`'s prayer-time session among them)
 * behaving exactly as it did. This default lives here, at the one JS-side
 * call site every platform's native binding (and the inert web/iOS stub)
 * goes through, rather than in the native module itself, which always
 * receives all three arguments as a result.
 */
export function startFocus(blocked: string[], endsAt: number, mode: BlockMode = 'remind'): void {
  native?.startFocus(blocked, endsAt, mode);
}

/** Idempotent: stopping a service that already stopped itself (its `endsAt`
 * passed) is a no-op, never an error. */
export function stopFocus(): void {
  native?.stopFocus();
}

export function isFocusRunning(): boolean {
  return native?.isFocusRunning() ?? false;
}

/**
 * Arms the real Fajr alarm for exactly `atEpochMs` -- a precise epoch
 * `data/alarm.ts` computes with `adhan`, never recomputed natively (see
 * `FajrAlarmTime.kt`'s doc for why there are deliberately not two
 * implementations of that calculation). A no-op everywhere but Android, and
 * a silent refusal on Android itself if `atEpochMs` is not strictly in the
 * future or exact alarms are not permitted -- callers must check
 * `canScheduleExact()` themselves rather than read "I called this" as "it
 * is now scheduled".
 */
export function scheduleFajrAlarm(atEpochMs: number): void {
  native?.scheduleFajrAlarm(atEpochMs);
}

/**
 * "Signalni sinab ko'rish" in settings/alarm.tsx -- the same chain as
 * `scheduleFajrAlarm`, under a separate native request code, so it can
 * never cancel, overwrite, or reschedule the real alarm `scheduleFajrAlarm`
 * armed. See `AlarmScheduler.kt`.
 */
export function scheduleTestAlarm(atEpochMs: number): void {
  native?.scheduleTestAlarm(atEpochMs);
}

export function cancelFajrAlarm(): void {
  native?.cancelFajrAlarm();
}

/** Whether the system will currently let this app schedule an exact alarm.
 * Always false off Android -- there is nothing to schedule exactly there. */
export function canScheduleExact(): boolean {
  return native?.canScheduleExact() ?? false;
}

/** Opens `Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM`; a no-op where
 * there is nothing to open (pre-Android 12, or off Android entirely). */
export function requestExactAlarmPermission(): void {
  native?.requestExactAlarmPermission();
}

/** What the system actually has armed for the real alarm, read back rather
 * than recomputed in JS -- `settings/alarm.tsx` shows this, not its own
 * guess, so the two can never quietly disagree. `null` when nothing is
 * armed, including on every platform without the module. */
export function nextFajrAlarmAt(): number | null {
  return native?.nextFajrAlarmAt() ?? null;
}

/** Stops the ringing alarm -- the native half of `ringing.tsx`'s
 * ten-second escape and `scan.tsx`'s successful match. Idempotent: calling
 * this when nothing is ringing is a no-op, never an error. */
export function stopAlarmSound(): void {
  native?.stopAlarmSound();
}

export function isIgnoringBatteryOptimizations(): boolean {
  return native?.isIgnoringBatteryOptimizations() ?? false;
}

/** Opens `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`; a no-op off
 * Android. */
export function requestIgnoreBatteryOptimizations(): void {
  native?.requestIgnoreBatteryOptimizations();
}
