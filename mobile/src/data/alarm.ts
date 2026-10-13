/**
 * The Fajr alarm.
 *
 * `notify.ts` builds a bounded window of notification timestamps because
 * Android cannot express "repeat forever at a time computed from the sun".
 * This alarm is the opposite shape: Android's one API that genuinely wakes
 * the device through Doze, `AlarmManager.setAlarmClock`, only ever fires
 * once -- so this schedules a single epoch, the next real Fajr, and is
 * re-run on every app start and settings change (see `_layout.tsx`) to lay
 * down the one after that. `AlarmScheduler.kt` holds the native half,
 * including the safety-net reschedule that covers the gap if the app is
 * never reopened before the next one is due.
 */
import { Platform } from 'react-native';

import {
  canScheduleExact,
  cancelFajrAlarm as nativeCancelFajrAlarm,
  scheduleFajrAlarm as nativeScheduleFajrAlarm,
} from '../../modules/app-watch';
import { timesFor, type Madhhab } from './prayer';
import type { Settings } from './store';

/**
 * The next Fajr strictly after `now`: today's if it has not happened yet,
 * tomorrow's otherwise. Pure, so "never a past time" and "madhhab changes
 * it" are testable without touching the native module at all.
 *
 * Deliberately not `nextPrayer` from `prayer.ts` -- that rolls to
 * tomorrow's Fajr only after Isha, which answers "what's the next prayer"
 * correctly but answers this question wrong: once today's Fajr itself has
 * passed, the Fajr alarm's next occurrence is tomorrow's regardless of
 * where the rest of the day stands.
 */
export function nextFajrAt(now: Date, madhhab: Madhhab): number {
  const today = timesFor(now, madhhab)[0].at; // ALL_SLOTS[0] is fajr
  if (today.getTime() > now.getTime()) return today.getTime();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return timesFor(tomorrow, madhhab)[0].at.getTime();
}

/**
 * Cancels, or arms, the one real native Fajr alarm to match `settings`.
 * Never claims to have scheduled anything it has not: when exact alarms
 * are refused, this returns without calling the native scheduler at all --
 * a caller must not read "the toggle is on" as "the alarm will ring".
 * `settings/alarm.tsx` shows the real state by reading `nextFajrAlarmAt()`
 * back from the system, not by trusting that this call succeeded.
 */
export function syncFajrAlarm(settings: Settings): void {
  if (Platform.OS !== 'android') return; // D3: Android-only, see AppWatchModule's doc

  if (!settings.fajrAlarm) {
    nativeCancelFajrAlarm();
    return;
  }

  if (!canScheduleExact()) return;

  nativeScheduleFajrAlarm(nextFajrAt(new Date(), settings.madhhab));
}
