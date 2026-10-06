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

export type DayRecord = { kept: number; rest?: boolean; updatedAt?: number };
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
 */
export function monthTotals(
  history: History,
  month: Date,
  startedAt?: string,
): { prayed: number; total: number } {
  const y = month.getFullYear();
  const m = month.getMonth();
  let prayed = 0;
  let total = 0;
  for (const [date, rec] of Object.entries(history)) {
    if (rec.rest) continue; // nothing was due, so it cannot count toward the total
    if (startedAt && date < startedAt) continue; // the app wasn't installed yet
    const { y: ky, m: km } = parseKey(date);
    if (ky !== y || km !== m) continue;
    prayed += rec.kept;
    total += FIVE_PER_DAY;
  }
  return { prayed, total };
}

/**
 * Per-day consistency between `from` and `to`, inclusive. A day with no
 * history entry is a day that was owed and not recorded, so it counts as
 * fully missed (0%) rather than being skipped — the only day skipped
 * entirely is a rest day, which owed nothing and has no percentage to show.
 */
export function consistency(
  history: History,
  from: Date,
  to: Date,
): { key: string; pct: number; warn?: boolean }[] {
  const out: { key: string; pct: number; warn?: boolean }[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= end) {
    const key = keyOf(cursor);
    const rec = history[key];
    if (!rec?.rest) {
      const kept = rec?.kept ?? 0;
      const pct = Math.round((kept / FIVE_PER_DAY) * 100);
      out.push({ key: String(cursor.getDate()), pct, warn: pct < 80 });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
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
