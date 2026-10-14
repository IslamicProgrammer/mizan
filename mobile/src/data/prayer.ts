/**
 * Prayer times.
 *
 * REAL, not mocked: computed with `adhan`, the standard implementation. Location
 * is pinned to Tashkent until the location permission screen is wired up.
 *
 * The madhhab choice genuinely changes Asr here — Hanafi uses two shadow
 * lengths, Shafi'i one — which is the distinction the onboarding icons encode.
 */
import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
  Qibla,
  SunnahTimes,
} from 'adhan';

import type { IconKey } from './icons';

export const TASHKENT = { lat: 41.2995, lon: 69.2401, city: 'Toshkent' };

export type PrayerId = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_NAMES: Record<PrayerId, string> = {
  fajr: 'Bomdod',
  sunrise: 'Quyosh chiqishi',
  dhuhr: 'Peshin',
  asr: 'Asr',
  maghrib: 'Shom',
  isha: 'Xufton',
};

/** Sunrise is shown in the timetable but is not one of the five prayers. */
export const FIVE: PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const ALL_SLOTS: PrayerId[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const ICON_FOR: Record<PrayerId, IconKey> = {
  fajr: 'fajr',
  sunrise: 'sunrise',
  dhuhr: 'dhuhr',
  asr: 'asr',
  maghrib: 'maghrib',
  isha: 'isha',
};

export type Madhhab = 'hanafi' | 'shafii';

function params(madhhab: Madhhab) {
  // Uzbekistan's muftiate calendar is closest to the Muslim World League
  // parameters; this is the default the mockups describe.
  const p = CalculationMethod.MuslimWorldLeague();
  p.madhab = madhhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return p;
}

export type Slot = { id: PrayerId; name: string; at: Date; icon: IconKey };

export function timesFor(date: Date, madhhab: Madhhab = 'hanafi'): Slot[] {
  const coords = new Coordinates(TASHKENT.lat, TASHKENT.lon);
  const t = new PrayerTimes(coords, date, params(madhhab));
  const at: Record<PrayerId, Date> = {
    fajr: t.fajr,
    sunrise: t.sunrise,
    dhuhr: t.dhuhr,
    asr: t.asr,
    maghrib: t.maghrib,
    isha: t.isha,
  };
  return ALL_SLOTS.map((id) => ({ id, name: PRAYER_NAMES[id], at: at[id], icon: ICON_FOR[id] }));
}

export function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** The next prayer, and how long until it. Rolls to tomorrow's Fajr after Isha. */
export function nextPrayer(now = new Date(), madhhab: Madhhab = 'hanafi') {
  const today = timesFor(now, madhhab).filter((s) => s.id !== 'sunrise');
  const upcoming = today.find((s) => s.at > now);
  if (upcoming) return { slot: upcoming, until: upcoming.at.getTime() - now.getTime() };

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fajr = timesFor(tomorrow, madhhab)[0];
  return { slot: fajr, until: fajr.at.getTime() - now.getTime() };
}

/** The prayer whose window we are currently inside. */
export function currentPrayer(now = new Date(), madhhab: Madhhab = 'hanafi'): PrayerId {
  const today = timesFor(now, madhhab).filter((s) => s.id !== 'sunrise');
  let cur: PrayerId = 'isha';
  for (const s of today) if (s.at <= now) cur = s.id;
  return cur;
}

export type BlockWindow = {
  /** The prayer whose "closed until" applies right now. */
  current: PrayerId;
  /** When that window opened. */
  windowStart: Date;
  /** When it closes -- the next prayer's start, rolled into tomorrow's
   * Fajr after Isha via `nextPrayer`. */
  windowEnd: Date;
  /** Rounded up, never down: a session that reads "0 daqiqa qoldi" while a
   * minute is still genuinely left is the kind of off-by-one a focus-mode
   * user notices immediately. */
  minutesLeft: number;
};

/**
 * What `focus/blocked.tsx` shows (block-screen.md): which prayer the
 * current block belongs to, the window's wall-clock bounds, and the
 * minutes left in it. Computed here, once, from `timesFor`/`nextPrayer` --
 * never a second calculation in Kotlin, which this file's own header
 * already warns would drift from this one.
 */
export function blockWindow(now: Date, madhhab: Madhhab = 'hanafi'): BlockWindow {
  const current = currentPrayer(now, madhhab);
  const windowStart = timesFor(now, madhhab).find((s) => s.id === current)!.at;
  const next = nextPrayer(now, madhhab);
  const minutesLeft = Math.max(0, Math.ceil(next.until / 60_000));
  return { current, windowStart, windowEnd: next.slot.at, minutesLeft };
}

export function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return {
    h,
    m,
    s: sec,
    hhmm: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    long: `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
  };
}

export function qiblaDegrees() {
  return Qibla(new Coordinates(TASHKENT.lat, TASHKENT.lon));
}

export function lastThirdOfNight(date = new Date(), madhhab: Madhhab = 'hanafi') {
  const coords = new Coordinates(TASHKENT.lat, TASHKENT.lon);
  const t = new PrayerTimes(coords, date, params(madhhab));
  return new SunnahTimes(t).lastThirdOfTheNight;
}

/**
 * Uzbek month and weekday names, written out rather than taken from Intl.
 *
 * Hermes ships a trimmed ICU and has no `uz-UZ` data, so
 * `toLocaleDateString('uz-UZ', { month: 'long' })` returns "M09" instead of
 * "sentabr". Anything user-facing must use these.
 */
export const MONTHS_UZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

export const WEEKDAYS_UZ = [
  'yakshanba', 'dushanba', 'seshanba', 'chorshanba',
  'payshanba', 'juma', 'shanba',
];

/** "29 sentabr" */
export const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS_UZ[d.getMonth()]}`;

/** "sentabr 2026" */
export const monthYear = (d: Date) => `${MONTHS_UZ[d.getMonth()]} ${d.getFullYear()}`;

export const weekday = (d: Date) => WEEKDAYS_UZ[d.getDay()];
