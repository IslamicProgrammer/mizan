export type DayRecord = { kept: number; rest?: boolean };
export type History = Record<string, DayRecord>;

/**
 * Five daily prayers, so no honest day exceeds it. The ceiling matters because
 * the merge takes the higher of two counts: without it, one client sending an
 * absurd number writes a value no later sync can ever bring back down, and the
 * garden and streak both read it as truth.
 */
const MAX_KEPT = 5;

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
 * permanent part of the one record both devices trust. The keys it rejects
 * are returned too, so a caller can tell the client what was thrown away
 * instead of leaving it to guess why its data came back different.
 */
function sanitize(history: History): { history: History; dropped: string[] } {
  const out: History = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(history)) {
    if (!isValidDateKey(key) || !isDayRecord(value)) {
      dropped.push(key);
      continue;
    }
    // Floor and clamp before the value is allowed to touch the merge: a
    // fractional count ("kept: 2.5") is not a number of prayers, and an
    // out-of-range one is handled by MAX_KEPT above.
    const kept = Math.min(Math.floor(value.kept), MAX_KEPT);
    out[key] = value.rest !== undefined ? { kept, rest: value.rest } : { kept };
  }
  return { history: out, dropped };
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
  return mergeHistoryWithDrops(local, remote).history;
}

/**
 * Same merge as `mergeHistory`, plus the keys either side lost to `sanitize`.
 * A separate function rather than widening `mergeHistory`'s return shape,
 * because callers that only want the merged history (and existing callers of
 * this exact signature) shouldn't have to unwrap a wrapper they don't need.
 */
export function mergeHistoryWithDrops(local: History, remote: History): { history: History; dropped: string[] } {
  const l = sanitize(local);
  const r = sanitize(remote);
  const out: History = { ...r.history };
  for (const [date, lRec] of Object.entries(l.history)) {
    const rRec = out[date];
    if (!rRec) {
      out[date] = lRec;
      continue;
    }
    const kept = Math.max(lRec.kept, rRec.kept);
    out[date] = lRec.rest || rRec.rest ? { kept, rest: true } : { kept };
  }
  const dropped = [...new Set([...l.dropped, ...r.dropped])];
  return { history: out, dropped };
}
