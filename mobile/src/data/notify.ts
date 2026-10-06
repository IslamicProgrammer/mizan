/**
 * Local prayer notifications.
 *
 * Everything here runs on-device: no account, no push server, no network.
 * Android caps how many alarms an app may have pending at once, and
 * `expo-notifications` has no way to express "repeat forever at a time
 * computed from the sun" — so instead of one open-ended recurrence, a
 * bounded window of concrete timestamps is built and rescheduled on every
 * launch. `buildSchedule` is pure so the window math can be tested without
 * touching the notifications module at all; `syncNotifications` is the only
 * place that talks to the device.
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { FIVE, PRAYER_NAMES, timesFor, type Madhhab } from './prayer';
import type { Settings } from './store';

export type Scheduled = { id: string; at: Date; title: string; body: string };

/**
 * Seven days of five prayers is 35 pending alarms, comfortably inside
 * Android's ceiling (500, but OEM battery managers start misbehaving well
 * before that) and short enough that a week-old install relaunched daily
 * never runs dry before the next sync tops it back up.
 */
export const WINDOW_DAYS = 7;

/** A stable per-day key, independent of locale — `toDateString` goes through
 * `Intl` on some engines and Hermes has no `uz-UZ` data to render it with. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function buildSchedule(
  from: Date,
  days: number,
  madhhab: Madhhab,
  minutesBefore: number,
): Scheduled[] {
  const out: Scheduled[] = [];
  for (let d = 0; d < days; d += 1) {
    const day = new Date(from);
    day.setDate(day.getDate() + d);
    for (const slot of timesFor(day, madhhab)) {
      if (!FIVE.includes(slot.id)) continue; // sunrise is not a prayer
      const at = new Date(slot.at.getTime() - minutesBefore * 60_000);
      if (at <= from) continue; // never let a past time fire immediately
      out.push({
        id: `${dayKey(day)}-${slot.id}`,
        at,
        title: PRAYER_NAMES[slot.id],
        body:
          minutesBefore > 0
            ? `${PRAYER_NAMES[slot.id]}gacha ${minutesBefore} daqiqa qoldi`
            : `${PRAYER_NAMES[slot.id]} vaqti kirdi`,
      });
    }
  }
  return out;
}

const CHANNEL_ID = 'prayers';

/**
 * Permission is asked for here, at the one call site every screen that wants
 * notifications funnels through, rather than at app launch — asking before
 * the user has seen anything worth being reminded about is the ask most
 * likely to be denied on reflex. A denial is a normal, permanent answer: the
 * function simply returns without scheduling anything, and nothing above it
 * treats that as an error.
 */
async function ensurePermission(): Promise<boolean> {
  // The simulator/emulator check guards CI and Expo Go on a bare emulator,
  // where there is no real notification channel to grant - asking there
  // only produces a confusing prompt that can never be answered usefully.
  if (!Device.isDevice) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (!existing.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/**
 * Cancels whatever this app previously scheduled and lays down a fresh
 * window. Cancel-then-reschedule, always in that order and never the
 * reverse, is what keeps a user who opens the app daily from accumulating
 * five duplicate reminders per prayer — rescheduling without cancelling
 * first was the one shortcut that would have made this feature actively
 * annoying instead of useful.
 *
 * Cycle mode suppresses prayer notifications entirely: `cycleMode` means the
 * user is not expected to pray right now, so firing five reminders a day
 * during it would contradict the app's own rest-day accounting on the
 * garden screen. The brief this was built from does not mention the
 * interaction, but shipping it without this check would mean the app
 * reminds a woman to pray during exactly the days it otherwise records as
 * rest.
 */
export async function syncNotifications(settings: Settings): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (settings.cycleMode) return;

  const granted = await ensurePermission();
  if (!granted) return;

  if (Platform.OS === 'android') {
    // Must run before anything is scheduled, or the first notification of a
    // fresh install posts through Android's noisy default channel instead
    // of this one.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Namoz vaqtlari',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const schedule = buildSchedule(new Date(), WINDOW_DAYS, settings.madhhab, settings.notifyBefore);
  for (const n of schedule) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: n.at,
        channelId: CHANNEL_ID,
      },
    });
  }
}
