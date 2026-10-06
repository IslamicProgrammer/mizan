/**
 * Pure arithmetic over recorded cycles, kept out of the screen component so
 * the inclusive/open-ended day count can be tested without mounting React —
 * the same reason prayer-history arithmetic lives in stats.ts rather than
 * inside a screen. Deliberately not importing from store.tsx: that module
 * pulls in AsyncStorage, which would drag a native dependency into what is
 * otherwise plain date arithmetic.
 */

export type Cycle = { from: string; to?: string };

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parses a `YYYY-MM-DD` key without going through `Date` parsing, which is
 * UTC-based and can shift a local calendar day by one depending on the
 * device's time zone. */
function parseYmd(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/**
 * How many days `cycle` has run, inclusive of both ends. A cycle that opens
 * and is read back the same day is one day long, not zero. An open cycle
 * (`to` absent) counts up to `today` rather than treating itself as having
 * zero duration.
 */
export function cycleLength(cycle: Cycle, today: Date): number {
  const from = parseYmd(cycle.from);
  const to = cycle.to ? parseYmd(cycle.to) : parseYmd(keyOf(today));
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

export { parseYmd };
