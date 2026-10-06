import { describe, expect, it } from 'vitest';

import { mergeHistory, type History } from '../sync/merge.js';

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
});
