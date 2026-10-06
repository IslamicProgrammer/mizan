export type DayRecord = { kept: number; rest?: boolean };
export type History = Record<string, DayRecord>;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A key must be syntactically YYYY-MM-DD *and* round-trip through `Date` to
 * the same string. The regex alone would accept "2026-02-30"; `Date`
 * silently normalizes that to March 2nd, and the mismatch after round-tripping
 * is how we catch it without hand-rolling a calendar.
 */
function isValidDateKey(key: string): boolean {
  if (!DATE_KEY.test(key)) return false;
  const d = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

/**
 * The static `History` type is what callers declare, but a day record that
 * actually originated from a client's JSON body can claim to be anything at
 * runtime. Checking the shape here, rather than trusting the cast at the call
 * site, is what keeps a malformed payload from a single device from
 * corrupting the one copy of history both devices share.
 */
function isDayRecord(value: unknown): value is DayRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  if (typeof r.kept !== 'number' || !Number.isFinite(r.kept) || r.kept < 0) return false;
  if ('rest' in r && typeof r.rest !== 'boolean') return false;
  return true;
}

/**
 * Drops anything that is not a real calendar date mapped to a well-formed day
 * record, before either side is allowed near the merge. A garbage key (stray
 * free text, "__proto__", an object instead of a string) is not a day of
 * prayer history to preserve — letting it survive the merge would make it a
 * permanent part of the one record both devices trust.
 */
function sanitize(history: History): History {
  const out: History = {};
  for (const [key, value] of Object.entries(history)) {
    if (!isValidDateKey(key) || !isDayRecord(value)) continue;
    out[key] = value.rest !== undefined ? { kept: value.kept, rest: value.rest } : { kept: value.kept };
  }
  return out;
}

/**
 * Last-write-wins would let a stale device erase a day that was actually
 * prayed. Prayers only accumulate, so the higher count is the true one, and a
 * rest day always survives — it is a statement ("I am not expected to pray
 * today"), not an absence of data, so it outranks a side that simply never
 * recorded one. A date in the future is merged like any other date rather
 * than rejected: a device whose clock or timezone is ahead of the server's is
 * routine, not an attack, and discarding its entry would be exactly the data
 * loss this function exists to prevent. A malformed date key or a value that
 * is not a day record is dropped instead, by `sanitize`, because there is no
 * real prayer history in it to lose.
 */
export function mergeHistory(local: History, remote: History): History {
  const l = sanitize(local);
  const r = sanitize(remote);
  const out: History = { ...r };
  for (const [date, lRec] of Object.entries(l)) {
    const rRec = out[date];
    if (!rRec) {
      out[date] = lRec;
      continue;
    }
    const kept = Math.max(lRec.kept, rRec.kept);
    out[date] = lRec.rest || rRec.rest ? { kept, rest: true } : { kept };
  }
  return out;
}
