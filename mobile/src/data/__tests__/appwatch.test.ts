import { hasUsageAccess, foregroundPackage, installedApps } from '../../../modules/app-watch';

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
});
