import { describe, expect, it, vi } from 'vitest';

import { mergeHistory, mergeHistoryWithDrops, type History } from '../sync/merge.js';

describe('mergeHistory', () => {
  it('keeps days present on only one side', () => {
    expect(mergeHistory({ '2026-10-01': { kept: 5 } }, { '2026-10-02': { kept: 3 } }))
      .toEqual({ '2026-10-01': { kept: 5 }, '2026-10-02': { kept: 3 } });
  });

  it('takes the higher count when a day exists on both', () => {
    expect(mergeHistory({ '2026-10-01': { kept: 2 } }, { '2026-10-01': { kept: 4 } }))
      .toEqual({ '2026-10-01': { kept: 4 } });
  });

  it('never downgrades a rest day to a zero day', () => {
    expect(mergeHistory({ '2026-10-01': { kept: 0, rest: true } }, { '2026-10-01': { kept: 0 } }))
      .toEqual({ '2026-10-01': { kept: 0, rest: true } });
  });

  it('handles an empty side without losing the other', () => {
    expect(mergeHistory({}, { '2026-10-01': { kept: 1 } })).toEqual({ '2026-10-01': { kept: 1 } });
  });

  it('keeps the rest flag even when the other side logged a higher count under it', () => {
    // One device says "rest day", the other says "prayed 5" for the same
    // date. Neither fact is discarded: the count is the real maximum and the
    // rest flag survives, because losing either one loses something true.
    expect(mergeHistory({ '2026-10-01': { kept: 0, rest: true } }, { '2026-10-01': { kept: 5 } }))
      .toEqual({ '2026-10-01': { kept: 5, rest: true } });
  });

  it('merges a future-dated entry instead of discarding it', () => {
    // A device whose clock or timezone is ahead of the server is routine,
    // not an attacker; rejecting the date would throw away a real prayer
    // count for no security benefit.
    expect(mergeHistory({ '2099-01-01': { kept: 2 } }, {})).toEqual({ '2099-01-01': { kept: 2 } });
  });

  it('drops a malformed date key rather than merging or crashing on it', () => {
    const local = { 'not-a-date': { kept: 9 } } as unknown as History;
    expect(mergeHistory(local, { '2026-10-01': { kept: 1 } })).toEqual({ '2026-10-01': { kept: 1 } });
  });

  it('drops a syntactically shaped but calendrically impossible date', () => {
    const local = { '2026-02-30': { kept: 9 } } as unknown as History;
    expect(mergeHistory(local, {})).toEqual({});
  });

  it('drops a value that is not a well-formed day record', () => {
    const remote = { '2026-10-01': { kept: 'five' } } as unknown as History;
    expect(mergeHistory({}, remote)).toEqual({});
  });

  it('clamps an absurd kept value to the five-prayer ceiling, permanently', () => {
    // The whole point: Math.max never comes back down, so if the clamp
    // didn't apply before the max, 999999 would win forever. A later
    // *honest* sync of 3 must still land on 5, not get re-poisoned by
    // whatever is already stored.
    const poisoned = mergeHistory({ '2026-10-01': { kept: 999999 } }, { '2026-10-01': { kept: 3 } });
    expect(poisoned).toEqual({ '2026-10-01': { kept: 5 } });

    const corrected = mergeHistory({ '2026-10-01': { kept: 3 } }, poisoned);
    expect(corrected).toEqual({ '2026-10-01': { kept: 5 } });
  });

  it('passes kept: 5 through untouched at the boundary', () => {
    expect(mergeHistory({ '2026-10-01': { kept: 5 } }, {})).toEqual({ '2026-10-01': { kept: 5 } });
  });

  it('floors a fractional kept value instead of treating it as a count', () => {
    expect(mergeHistory({ '2026-10-01': { kept: 2.5 } }, {})).toEqual({ '2026-10-01': { kept: 2 } });
  });

  it('reports dropped keys from either side without touching mergeHistory itself', () => {
    const local = { 'not-a-date': { kept: 9 } } as unknown as History;
    const remote = { '2026-10-01': { kept: 'five' } } as unknown as History;
    expect(mergeHistoryWithDrops(local, remote)).toEqual({ history: {}, dropped: ['not-a-date', '2026-10-01'] });
  });

  it('reports an empty dropped list when nothing was rejected', () => {
    expect(mergeHistoryWithDrops({ '2026-10-01': { kept: 1 } }, {})).toEqual({
      history: { '2026-10-01': { kept: 1 } },
      dropped: [],
    });
  });
});

describe('mergeHistory with updatedAt', () => {
  const older = { kept: 5, updatedAt: 1_000 };
  const newer = { kept: 4, updatedAt: 2_000 };

  it('lets a newer record lower the count', () => {
    expect(mergeHistory({ '2026-10-01': newer }, { '2026-10-01': older }))
      .toEqual({ '2026-10-01': newer });
  });

  it('lets a newer record clear a rest day', () => {
    expect(mergeHistory(
      { '2026-10-01': { kept: 0, updatedAt: 2_000 } },
      { '2026-10-01': { kept: 0, rest: true, updatedAt: 1_000 } },
    )).toEqual({ '2026-10-01': { kept: 0, updatedAt: 2_000 } });
  });

  it('falls back to the monotonic rule when either side has no timestamp', () => {
    expect(mergeHistory({ '2026-10-01': { kept: 5 } }, { '2026-10-01': { kept: 2 } }))
      .toEqual({ '2026-10-01': { kept: 5 } });
  });

  it('prefers the timestamped record when only one side has one', () => {
    expect(mergeHistory({ '2026-10-01': { kept: 1, updatedAt: 9 } }, { '2026-10-01': { kept: 5 } }))
      .toEqual({ '2026-10-01': { kept: 1, updatedAt: 9 } });
  });

  it('falls back to the monotonic rule on a tie, regardless of argument order', () => {
    // Equal timestamps must not let either argument win outright - the
    // whole point of the comparator is that the result does not depend on
    // which side was passed as `local` and which as `remote`.
    const a = { '2026-10-01': { kept: 1, rest: true, updatedAt: 5_000 } };
    const b = { '2026-10-01': { kept: 4, updatedAt: 5_000 } };
    const expected = { '2026-10-01': { kept: 4, rest: true, updatedAt: 5_000 } };
    expect(mergeHistory(a, b)).toEqual(expected);
    expect(mergeHistory(b, a)).toEqual(expected);
  });
});

describe('sanitize clamps updatedAt to now', () => {
  it('pins a year-9999 timestamp to now instead of letting it win merges forever', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    const farFuture = Date.UTC(9999, 0, 1);
    const poisoned = mergeHistory({ '2026-10-01': { kept: 1, updatedAt: farFuture } }, {});
    expect(poisoned).toEqual({ '2026-10-01': { kept: 1, updatedAt: Date.now() } });

    // Advance real time and apply an honest, later correction. It must win -
    // which it never could if the poisoned record had kept its claimed
    // year-9999 stamp instead of being clamped.
    vi.setSystemTime(new Date('2026-10-02T00:00:00Z'));
    const corrected = mergeHistory({ '2026-10-01': { kept: 4, updatedAt: Date.now() } }, poisoned);
    expect(corrected).toEqual({ '2026-10-01': { kept: 4, updatedAt: Date.now() } });
    vi.useRealTimers();
  });

  it('still works for a clock that is only slightly ahead', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    const slightlyAhead = Date.now() + 60_000; // a clock a minute fast, not an attack
    const result = mergeHistory({ '2026-10-01': { kept: 3, updatedAt: slightlyAhead } }, {});
    expect(result).toEqual({ '2026-10-01': { kept: 3, updatedAt: Date.now() } });
    vi.useRealTimers();
  });
});
