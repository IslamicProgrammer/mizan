import {
  hasUsageAccess,
  foregroundPackage,
  installedApps,
  isFocusRunning,
  startFocus,
  stopFocus,
} from '../../../modules/app-watch';

describe('app-watch on a platform without it', () => {
  it('reports no access rather than throwing', () => {
    expect(hasUsageAccess()).toBe(false);
  });
  it('returns null for the foreground app', () => {
    expect(foregroundPackage()).toBeNull();
  });
  it('returns an empty list, not undefined', () => {
    expect(installedApps()).toEqual([]);
  });
  it('never throws starting or stopping a focus session', () => {
    expect(() => startFocus(['com.example.app'], Date.now() + 60_000)).not.toThrow();
    expect(() => stopFocus()).not.toThrow();
  });
  it('reports the service as never running', () => {
    expect(isFocusRunning()).toBe(false);
  });
});
