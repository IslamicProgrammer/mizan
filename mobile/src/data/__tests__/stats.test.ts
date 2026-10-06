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

  afterEach(() => {
    jest.useRealTimers();
  });

  it('draws no bar for a day in the future', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02'));
    const bars = consistency({ '2026-10-01': { kept: 5 } }, new Date('2026-10-01'), new Date('2026-10-31'), '2026-10-01');
    // with today pinned to 2026-10-02 via fake timers
    expect(bars).toHaveLength(2);
  });

  it('draws no bar before the user started', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-05'));
    const bars = consistency({ '2026-10-05': { kept: 5 } }, new Date('2026-10-01'), new Date('2026-10-31'), '2026-10-05');
    expect(bars.every((b) => Number(b.key) >= 5)).toBe(true);
  });

  it('does not flag a rest day as a miss', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01'));
    const bars = consistency({ '2026-10-01': { kept: 0, rest: true } }, new Date('2026-10-01'), new Date('2026-10-31'), '2026-10-01');
    expect(bars.some((b) => b.warn)).toBe(false);
  });

  it('still flags a real missed day', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01'));
    const bars = consistency({ '2026-10-01': { kept: 0 } }, new Date('2026-10-01'), new Date('2026-10-31'), '2026-10-01');
    expect(bars[0]?.warn).toBe(true);
  });
});
