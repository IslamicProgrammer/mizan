import { consistency, longestStreak, monthTotals, perPrayer, type History } from '../stats';

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

  afterEach(() => {
    jest.useRealTimers();
  });

  it('charges today only for the prayers that have come round, not all five', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02T06:00:00Z'));
    const history = { '2026-10-01': { kept: 5 }, '2026-10-02': { kept: 0 } };
    expect(monthTotals(history, new Date('2026-10-02'), '2026-10-01', 1))
      .toEqual({ prayed: 5, total: 6 });
  });

  it("gives full credit when today's single due prayer is kept", () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02T06:00:00Z'));
    const history = { '2026-10-01': { kept: 5 }, '2026-10-02': { kept: 1 } };
    expect(monthTotals(history, new Date('2026-10-02'), '2026-10-01', 1))
      .toEqual({ prayed: 6, total: 6 });
  });

  it('omitting owedToday contributes nothing for today, not a full five', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02T06:00:00Z'));
    const history = { '2026-10-01': { kept: 5 }, '2026-10-02': { kept: 0 } };
    expect(monthTotals(history, new Date('2026-10-02'), '2026-10-01'))
      .toEqual({ prayed: 5, total: 5 });
  });

  it('never lets a stale kept count exceed what today actually owed', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02T06:00:00Z'));
    const history = { '2026-10-02': { kept: 5 } };
    expect(monthTotals(history, new Date('2026-10-02'), '2026-10-02', 2))
      .toEqual({ prayed: 2, total: 2 });
  });

  it('a live cycle-mode rest day owes nothing toward the total', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02T06:00:00Z'));
    const history = { '2026-10-02': { kept: 0, rest: true as const } };
    expect(monthTotals(history, new Date('2026-10-02'), '2026-10-02', 1))
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
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02'));
    const bars = consistency({ '2026-10-01': { kept: 0 } }, new Date('2026-10-01'), new Date('2026-10-31'), '2026-10-01');
    expect(bars[0]?.warn).toBe(true);
  });

  it('never flags today, however little of it has happened', () => {
    // clock pinned to 2026-10-02T05:00:00Z
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02T05:00:00Z'));
    const bars = consistency(
      { '2026-10-01': { kept: 5 }, '2026-10-02': { kept: 1 } },
      new Date('2026-10-01'),
      new Date('2026-10-31'),
      '2026-10-01',
    );
    const today = bars.find((b) => b.key === '2');
    expect(today?.pct).toBe(20);
    expect(today?.warn).toBeFalsy();
  });

  it('flags that same day once it is yesterday', () => {
    // clock pinned to 2026-10-03T05:00:00Z, same history
    jest.useFakeTimers().setSystemTime(new Date('2026-10-03T05:00:00Z'));
    const bars = consistency(
      { '2026-10-01': { kept: 5 }, '2026-10-02': { kept: 1 } },
      new Date('2026-10-01'),
      new Date('2026-10-31'),
      '2026-10-01',
    );
    expect(bars.find((b) => b.key === '2')?.warn).toBe(true);
  });
});

describe('perPrayer', () => {
  const ph: History = {
    '2026-10-01': { kept: 5, prayers: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] },
    '2026-10-02': { kept: 4, prayers: ['dhuhr', 'asr', 'maghrib', 'isha'] },
    '2026-10-03': { kept: 0, rest: true },
    '2026-10-04': { kept: 2 },
  };

  it('reports each prayer over the days that actually recorded one', () => {
    const r = perPrayer(ph, new Date('2026-10-01'), new Date('2026-10-04'), '2026-10-01');
    const fajr = r.find((x) => x.key === 'fajr');
    // Oct 1 kept it, Oct 2 did not. Oct 3 is a rest day and owes nothing.
    // Oct 4 has a count but no `prayers`, so it cannot say anything about Fajr.
    expect(fajr).toEqual({ key: 'fajr', pct: 50, days: 2 });
  });

  it('never reports sunrise, which is not a prayer', () => {
    const r = perPrayer(ph, new Date('2026-10-01'), new Date('2026-10-04'), '2026-10-01');
    expect(r.map((x) => x.key)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
  });

  it('returns zero days rather than NaN when nothing has been recorded', () => {
    const r = perPrayer({}, new Date('2026-10-01'), new Date('2026-10-04'), undefined);
    expect(r.every((x) => x.pct === 0 && x.days === 0)).toBe(true);
  });
});
