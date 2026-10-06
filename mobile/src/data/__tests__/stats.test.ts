import { consistency, longestStreak, monthTotals } from '../stats';

const h = {
  '2026-10-01': { kept: 5 },
  '2026-10-02': { kept: 3 },
  '2026-10-03': { kept: 0, rest: true },
};

describe('monthTotals', () => {
  it('counts only days from startedAt onward', () => {
    expect(monthTotals(h, new Date('2026-10-15'), '2026-10-02'))
      .toEqual({ prayed: 3, total: 5 });
  });

  it('excludes rest days from the denominator', () => {
    // 2026-10-03 is a rest day: it owes nothing and cannot be missed
    expect(monthTotals(h, new Date('2026-10-15'), '2026-10-01'))
      .toEqual({ prayed: 8, total: 10 });
  });

  it('returns zeroes rather than NaN for an empty history', () => {
    expect(monthTotals({}, new Date('2026-10-15'), undefined))
      .toEqual({ prayed: 0, total: 0 });
  });
});

describe('longestStreak', () => {
  it('does not let a rest day break the run', () => {
    expect(longestStreak(h)).toBe(3);
  });
});

describe('consistency', () => {
  it('returns no rows for an empty history over an empty range', () => {
    const from = new Date('2026-10-05');
    expect(consistency({}, from, from)).toEqual([{ key: '5', pct: 0, warn: true }]);
  });
});
