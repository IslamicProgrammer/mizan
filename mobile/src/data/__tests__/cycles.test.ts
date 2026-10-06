import { cycleLength } from '../cycles';

describe('cycleLength', () => {
  it('counts a closed cycle inclusively of both ends', () => {
    // 12th through 17th is six calendar days, not five.
    expect(cycleLength({ from: '2026-09-12', to: '2026-09-17' }, new Date('2026-10-01'))).toBe(6);
  });

  it('counts a same-day cycle as one day, not zero', () => {
    expect(cycleLength({ from: '2026-09-12', to: '2026-09-12' }, new Date('2026-10-01'))).toBe(1);
  });

  it('counts an open cycle up to today', () => {
    expect(cycleLength({ from: '2026-10-01' }, new Date('2026-10-04'))).toBe(4);
  });
});
