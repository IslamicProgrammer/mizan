/**
 * Pure arithmetic over prayer history.
 *
 * Deliberately free of React and of the store: the whole reason the last two
 * fabricated-numbers defects kept recurring is that the arithmetic lived
 * inside a component or inside the store, where it could only be exercised by
 * rendering a screen. Keeping it here, taking plain data in and plain data
 * out, is what lets a test assert on the one case that matters most and is
 * easiest to miss by hand: an empty history must come out to zero, never NaN.
 *
 * A rest day (cycle-mode, see store.tsx) owes nothing: it never adds to a
 * percentage's denominator and never breaks a streak. A day before the user
 * installed the app is not a day they failed — it simply isn't counted,
 * which falls out for free here because such a day never has a history
 * entry to iterate over in the first place.
 */

import { FIVE, type PrayerId } from './prayer';

export type DayRecord = { kept: number; rest?: boolean; prayers?: PrayerId[]; updatedAt?: number };
export type History = Record<string, DayRecord>;

const FIVE_PER_DAY = 5;

/** Parses a `YYYY-MM-DD` key without going through `Date` parsing, which is
 * UTC-based and can shift a local calendar day by one depending on the
 * device's time zone. */
function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m: (m ?? 1) - 1, d: d ?? 1 };
}

/** A UTC day index, so two keys' distance apart can be compared as plain
 * integers instead of re-deriving month lengths and leap years by hand. */
function dayIndex(key: string): number {
  const { y, m, d } = parseKey(key);
  return Math.floor(Date.UTC(y, m, d) / 86_400_000);
}

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Totals for the calendar month `month` falls in. Only days that actually
 * have a history entry are counted — which is what keeps a day before
 * `startedAt` or a day that hasn't happened yet out of the total without any
 * special-casing of "the future" or "before install": neither ever produced
 * a history entry to begin with.
 *
 * Today is the one day in `history` that is still in progress, so it cannot
 * be charged the full five like an already-finished day — a user who has
 * kept every prayer that has come round so far would otherwise be shown as
 * failing the ones that simply haven't arrived yet. `owedToday` is how many
 * of today's five prayer times have actually passed, supplied by the
 * caller because this module stays pure and never reaches for the clock or
 * the store itself. It defaults to zero rather than five: a caller that
 * forgets to pass it should make today under-report, not invent a day's
 * worth of failure. `Math.min` guards the other direction — a stale or
 * over-large `kept` must never contribute more than the day actually owed.
 */
export function monthTotals(
  history: History,
  month: Date,
  startedAt?: string,
  owedToday?: number,
): { prayed: number; total: number } {
  const y = month.getFullYear();
  const m = month.getMonth();
  const todayKey = keyOf(new Date());
  let prayed = 0;
  let total = 0;
  for (const [date, rec] of Object.entries(history)) {
    if (rec.rest) continue; // nothing was due, so it cannot count toward the total
    if (startedAt && date < startedAt) continue; // the app wasn't installed yet
    const { y: ky, m: km } = parseKey(date);
    if (ky !== y || km !== m) continue;
    if (date === todayKey) {
      const owed = owedToday ?? 0;
      prayed += Math.min(rec.kept, owed);
      total += owed;
    } else {
      prayed += rec.kept;
      total += FIVE_PER_DAY;
    }
  }
  return { prayed, total };
}

/**
 * Per-day consistency between `from` and `to`, inclusive. A day with no
 * history entry and no record is only a real miss if it was actually owed:
 * on or before today, and on or after `startedAt`. A future day is not a day
 * yet, and a day before the app was installed is not a day the user failed
 * — neither gets a bar at all, the same way a rest day doesn't. Only a day
 * genuinely inside that owed window comes out as fully missed (0%) when
 * untouched.
 *
 * `to` is clamped to today here rather than trusting every caller to do it,
 * because the one time a caller forgets is the time the garden lies again.
 */
export function consistency(
  history: History,
  from: Date,
  to: Date,
  startedAt?: string,
): { key: string; pct: number; warn?: boolean }[] {
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = keyOf(today);
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const clampedEnd = end > todayMid ? todayMid : end;

  // An install that predates `startedAt` has no recorded start date. Falling
  // back to the earliest day actually in history means an old install still
  // gets nothing but a wall of warnings for days before the app ever wrote
  // anything — same rule, just applied from the best evidence available.
  const earliest = startedAt ?? Object.keys(history).sort()[0];

  const out: { key: string; pct: number; warn?: boolean }[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (cursor <= clampedEnd) {
    const key = keyOf(cursor);
    const owed = !earliest || key >= earliest;
    const rec = history[key];
    if (owed && !rec?.rest) {
      const kept = rec?.kept ?? 0;
      const pct = Math.round((kept / FIVE_PER_DAY) * 100);
      // Today is still in progress: the prayers that have not come round yet are not
      // owed, so a partial count is not a miss. The bar still shows what has been
      // kept so far.
      out.push({ key: String(cursor.getDate()), pct, warn: key !== todayKey && pct < 80 });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * Per-prayer consistency between `from` and `to`, inclusive — the figure
 * `consistency` cannot produce because a daily count alone cannot say which
 * prayer was missed.
 *
 * A day counts toward every prayer's denominator together, not one prayer at
 * a time: the presence of `prayers` is what makes a day *known* at all, and
 * once it's known, an absence from the array is a definite "not kept" for
 * that prayer, exactly as real as a presence in it. A day with no `prayers`
 * array — a legacy record, or one only ever touched by a plain `repairDay()`
 * with no prayer named — cannot say anything about any individual prayer, so
 * it is skipped for all five rather than guessed at; that would fabricate the
 * exact thing this project keeps removing. Rest days and days outside the
 * owed window (before `startedAt`, or after today) are skipped the same way
 * `consistency` skips them, for the same reason: nothing was due.
 */
export function perPrayer(
  history: History,
  from: Date,
  to: Date,
  startedAt?: string,
): { key: PrayerId; pct: number; days: number }[] {
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const clampedEnd = end > todayMid ? todayMid : end;
  const earliest = startedAt ?? Object.keys(history).sort()[0];

  const counts: Record<PrayerId, number> = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
  let days = 0;

  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (cursor <= clampedEnd) {
    const key = keyOf(cursor);
    const owed = !earliest || key >= earliest;
    const rec = history[key];
    if (owed && rec && !rec.rest && rec.prayers) {
      days += 1;
      for (const p of rec.prayers) if (FIVE.includes(p)) counts[p] += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return FIVE.map((key) => ({
    key,
    pct: days > 0 ? Math.round((counts[key] / days) * 100) : 0,
    days,
  }));
}

/**
 * The longest unbroken run of days in all of history, not just the run
 * ending today (that one is `streak`, on the store). A rest day sits inside
 * a run without needing a prayer of its own — it is a statement that
 * nothing was due, not a gap — but a day with no history entry at all, or a
 * day that owed prayers and kept none, ends the run.
 */
export function longestStreak(history: History): number {
  const keys = Object.keys(history).sort();
  let best = 0;
  let run = 0;
  let prevKey: string | null = null;
  for (const key of keys) {
    const rec = history[key]!;
    const qualifies = rec.rest === true || rec.kept > 0;
    if (!qualifies) {
      run = 0;
    } else if (prevKey !== null && dayIndex(key) - dayIndex(prevKey) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prevKey = key;
  }
  return best;
}
