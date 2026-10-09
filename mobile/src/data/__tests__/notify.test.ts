import { buildSchedule } from '../notify';

describe('buildSchedule', () => {
  const from = new Date('2026-10-06T00:00:00+05:00');

  it('schedules five prayers a day, excluding sunrise', () => {
    const s = buildSchedule(from, 1, 'hanafi', 0);
    expect(s).toHaveLength(5);
    expect(s.some((n) => n.id.includes('sunrise'))).toBe(false);
  });

  it('never schedules a time already in the past', () => {
    const late = new Date('2026-10-06T23:30:00+05:00');
    expect(buildSchedule(late, 1, 'hanafi', 0).every((n) => n.at > late)).toBe(true);
  });

  it('applies the lead time', () => {
    const none = buildSchedule(from, 1, 'hanafi', 0);
    const lead = buildSchedule(from, 1, 'hanafi', 15);
    expect(none[0].at.getTime() - lead[0].at.getTime()).toBe(15 * 60 * 1000);
  });

  it('stays under the Android pending-alarm ceiling for the full window', () => {
    expect(buildSchedule(from, 7, 'hanafi', 10).length).toBeLessThanOrEqual(50);
  });

  it('gives every notification a unique id across the window', () => {
    const s = buildSchedule(from, 7, 'hanafi', 10);
    expect(new Set(s.map((n) => n.id)).size).toBe(s.length);
  });

  it('writes Uzbek copy naming the prayer, not a placeholder', () => {
    const s = buildSchedule(from, 1, 'hanafi', 10);
    const fajr = s.find((n) => n.id.includes('fajr'));
    expect(fajr?.title).toBe('Bomdod');
    expect(fajr?.body).toContain('10 daqiqa');
  });
});

describe('canUseNotifications', () => {
  const load = () => {
    let fn: () => boolean = () => false;
    jest.isolateModules(() => {
      // `jest.isolateModules` runs synchronously, so the module has to be
      // pulled in with `require` — an `import` would be hoisted out of the
      // isolated registry and would read the mock set by whichever test ran
      // first, making all three pass or fail together.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      fn = require('../notify').canUseNotifications;
    });
    return fn;
  };

  afterEach(() => jest.resetModules());

  it('refuses inside Expo Go, where importing the module would throw', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { executionEnvironment: 'storeClient' },
      ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
    }));
    expect(load()()).toBe(false);
  });

  it('allows it in a development build, which has the native module', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { executionEnvironment: 'bare' },
      ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
    }));
    expect(load()()).toBe(true);
  });

  it('allows it in a store build', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { executionEnvironment: 'standalone' },
      ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
    }));
    expect(load()()).toBe(true);
  });
});
