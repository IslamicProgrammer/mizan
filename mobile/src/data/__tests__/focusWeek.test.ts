import { hasAnyFocus, lastSevenDays } from '../focusWeek';

describe('lastSevenDays', () => {
  it('returns the seven calendar days ending today, oldest first', () => {
    const today = new Date('2026-10-10T12:00:00.000Z');
    const week = lastSevenDays({}, today);

    expect(week.map((w) => w.date)).toEqual([
      '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
      '2026-10-08', '2026-10-09', '2026-10-10',
    ]);
  });

  it('is the window ending today, not the window that happens to have data', () => {
    // All the recorded data is three weeks old; none of it belongs in a
    // chart whose window is "the last seven days", so every slot is zero.
    const today = new Date('2026-10-10T12:00:00.000Z');
    const focusByDay = { '2026-09-15': 50, '2026-09-16': 40 };

    const week = lastSevenDays(focusByDay, today);

    expect(week.every((w) => w.minutes === 0)).toBe(true);
  });

  it('fills a day with no session as a real zero, not a gap', () => {
    const today = new Date('2026-10-10T12:00:00.000Z');
    const focusByDay = { '2026-10-10': 25 };

    const week = lastSevenDays(focusByDay, today);

    expect(week.find((w) => w.date === '2026-10-04')).toEqual({ date: '2026-10-04', minutes: 0 });
    expect(week.find((w) => w.date === '2026-10-10')).toEqual({ date: '2026-10-10', minutes: 25 });
  });
});

describe('hasAnyFocus', () => {
  it('is false for an install that has never run a session', () => {
    expect(hasAnyFocus({})).toBe(false);
    expect(hasAnyFocus({ '2026-10-01': 0, '2026-10-02': 0 })).toBe(false);
  });

  it('is true once any day has a real minute banked', () => {
    expect(hasAnyFocus({ '2026-10-01': 0, '2026-10-02': 5 })).toBe(true);
  });
});
