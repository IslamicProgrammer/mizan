/**
 * `updatedAt` is optional because every client already in the field predates
 * it and will never send one. That absence is not a gap to fill in — it is
 * the signal that tells the merge "this device cannot express a correction,
 * fall back to the old monotonic rule for it."
 */
export type DayRecord = { kept: number; rest?: boolean; updatedAt?: number };
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
  // An invalid timestamp is worse than a missing one: a missing one falls
  // back to the monotonic rule, but a garbage one (NaN, a negative, a
  // string) could let a device win a whole-record overwrite it never earned.
  if ('updatedAt' in r && (typeof r.updatedAt !== 'number' || !Number.isFinite(r.updatedAt) || r.updatedAt < 0)) {
    return false;
  }
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
    const rec: DayRecord = { kept };
    if (value.rest !== undefined) rec.rest = value.rest;
    if (value.updatedAt !== undefined) {
      // A timestamp from the future would win every merge forever, so it is pinned to
      // now — the same reason `kept` is capped at five. A clock that is merely a
      // little fast still works; one claiming the year 9999 does not get to freeze a
      // day permanently.
      rec.updatedAt = Math.min(value.updatedAt, Date.now());
    }
    out[key] = rec;
  }
  return { history: out, dropped };
}

/**
 * Pure last-write-wins would let a stale device erase a day that was
 * actually prayed, so plain timestamps are not enough on their own — the
 * monotonic rule below is still what protects a record that carries no
 * timestamp at all. Prayers only accumulate under that rule, and a rest day
 * always survives — it is a statement ("I am not expected to pray today"),
 * not an absence of data, so it outranks a side that simply never recorded
 * one. A date in the future is merged like any other date rather than
 * rejected: a device whose clock or timezone is ahead of the server's is
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
    out[date] = rRec ? mergeDay(lRec, rRec) : lRec;
  }
  const dropped = [...new Set([...l.dropped, ...r.dropped])];
  return { history: out, dropped };
}

/**
 * Client timestamps are an honest trade-off, not a complete solution. A
 * device whose clock runs fast always wins a correction it has no special
 * claim to, and a device whose clock runs backwards can lose its own later,
 * real edit to its own earlier write — there is no way to tell "the clock is
 * wrong" from "the write really did happen first" using only what the client
 * reports. That is acceptable for v1 because the alternative (no correction
 * at all, pure monotonic accumulation) is worse, but it is not free, and the
 * fix — a server-assigned sequence number instead of a client-reported time —
 * is not implemented here. Written down so the next person debugging "my
 * correction didn't stick" starts from this trade-off instead of
 * rediscovering it from a bug report.
 *
 * The per-date comparator. A record with a timestamp is a device telling us
 * "this is the true state of this day as of this moment" — count and rest
 * flag together, as one statement, not two fields to reconcile separately.
 * Splitting them (say, taking the newer count but OR-ing the old rest flag)
 * would let the stale side's rest flag survive a correction that was
 * supposed to clear it, which is exactly the bug this function exists to
 * fix. So when both sides have a timestamp, the strictly newer one wins
 * whole. When only one side has a timestamp, that side is the only one
 * capable of expressing a correction at all, so it wins whole regardless of
 * the untimestamped side's count. When neither has one — the common case
 * while old clients are still in the field — fall back to the monotonic
 * rule. Equal timestamps also fall back to the monotonic rule rather than
 * picking either argument, specifically so the result never depends on
 * which side was passed as `local` and which as `remote`.
 */
function mergeDay(a: DayRecord, b: DayRecord): DayRecord {
  if (a.updatedAt !== undefined && b.updatedAt !== undefined) {
    if (a.updatedAt > b.updatedAt) return a;
    if (b.updatedAt > a.updatedAt) return b;
    return monotonic(a, b, a.updatedAt);
  }
  if (a.updatedAt !== undefined) return a;
  if (b.updatedAt !== undefined) return b;
  return monotonic(a, b);
}

/**
 * The original Task 7 rule, kept verbatim for the case neither side (or, on
 * an equal-timestamp tie, both sides equally) can express a correction. An
 * `updatedAt` is attached to the result only when the caller had one to
 * offer (the tie case) — inventing one for two untimestamped records would
 * claim a precision about "when" that never existed.
 */
function monotonic(a: DayRecord, b: DayRecord, updatedAt?: number): DayRecord {
  const kept = Math.max(a.kept, b.kept);
  const rec: DayRecord = a.rest || b.rest ? { kept, rest: true } : { kept };
  if (updatedAt !== undefined) rec.updatedAt = updatedAt;
  return rec;
}
