import { nextFajrAt, syncFajrAlarm } from '../alarm';
import type { Settings } from '../store';

// `jest.mock`'s factory runs hoisted, before this file's own `const`s exist
// -- only names prefixed `mock` (jest's own escape hatch for exactly this)
// may be referenced inside it.
const mockScheduleFajrAlarm = jest.fn();
const mockCancelFajrAlarm = jest.fn();
let mockCanScheduleExact = true;

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('../../../modules/app-watch', () => ({
  scheduleFajrAlarm: (atEpochMs: number) => mockScheduleFajrAlarm(atEpochMs),
  cancelFajrAlarm: () => mockCancelFajrAlarm(),
  canScheduleExact: () => mockCanScheduleExact,
}));

const scheduleFajrAlarm = mockScheduleFajrAlarm;
const cancelFajrAlarm = mockCancelFajrAlarm;

const BASE_SETTINGS: Settings = {
  madhhab: 'hanafi',
  gender: null,
  scanObject: 'mat',
  fajrAlarm: true,
  focusEnabled: true,
  cycleMode: false,
  nightTheme: false,
  notifyBefore: 15,
  testBlockNow: false,
  blockMode: 'remind',
};

describe('syncFajrAlarm', () => {
  beforeEach(() => {
    scheduleFajrAlarm.mockClear();
    cancelFajrAlarm.mockClear();
    mockCanScheduleExact = true;
  });

  it('cancels the native alarm when the toggle is off', () => {
    syncFajrAlarm({ ...BASE_SETTINGS, fajrAlarm: false });
    expect(cancelFajrAlarm).toHaveBeenCalledTimes(1);
    expect(scheduleFajrAlarm).not.toHaveBeenCalled();
  });

  it('does not claim to have scheduled when exact alarms are refused', () => {
    mockCanScheduleExact = false;
    syncFajrAlarm({ ...BASE_SETTINGS, fajrAlarm: true });
    expect(scheduleFajrAlarm).not.toHaveBeenCalled();
    // Nor does it fall back to cancelling -- the toggle really is on, this
    // call just cannot make good on it yet.
    expect(cancelFajrAlarm).not.toHaveBeenCalled();
  });

  it('schedules the next Fajr once the toggle is on and exact alarms are allowed', () => {
    syncFajrAlarm({ ...BASE_SETTINGS, fajrAlarm: true });
    expect(scheduleFajrAlarm).toHaveBeenCalledTimes(1);
    expect(typeof scheduleFajrAlarm.mock.calls[0][0]).toBe('number');
  });
});

describe('nextFajrAt', () => {
  it("returns tomorrow's Fajr once today's has passed", () => {
    const late = new Date('2026-10-06T23:30:00+05:00');
    const next = nextFajrAt(late, 'hanafi');
    expect(next).toBeGreaterThan(late.getTime());
    expect(new Date(next).getDate()).toBe(7);
  });

  it("returns today's Fajr while it is still ahead", () => {
    const early = new Date('2026-10-06T00:30:00+05:00');
    const next = nextFajrAt(early, 'hanafi');
    expect(new Date(next).getDate()).toBe(6);
  });

  it('never returns a time in the past', () => {
    const now = new Date('2026-10-06T23:30:00+05:00');
    expect(nextFajrAt(now, 'hanafi')).toBeGreaterThan(now.getTime());
  });
});
