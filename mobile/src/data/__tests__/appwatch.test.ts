import {
  appIcon,
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
  it('does not ship icons inline, which would not scale past a few apps', () => {
    for (const a of installedApps()) expect(a).not.toHaveProperty('icon');
  });
  it('returns null for an icon on a platform without the module', () => {
    expect(appIcon('com.example.whatever')).toBeNull();
  });
  it('never throws starting or stopping a focus session', () => {
    expect(() => startFocus(['com.example.app'], Date.now() + 60_000)).not.toThrow();
    expect(() => stopFocus()).not.toThrow();
  });
  it('never throws when a mode is passed explicitly either', () => {
    expect(() => startFocus(['com.example.app'], Date.now() + 60_000, 'lock')).not.toThrow();
  });
  it('reports the service as never running', () => {
    expect(isFocusRunning()).toBe(false);
  });
});

/**
 * Task 23's compatibility promise: `startFocus`'s third argument is new,
 * and a call site written before it existed -- `focus/active.tsx`'s
 * prayer-time session, for one -- must keep behaving exactly as it did.
 * The platform guard above means `native` is always null in this file's
 * default test environment, so none of those tests can see what actually
 * reaches the native side; this one forces `Platform.OS` to `'android'`
 * and replaces the native binding with a spy to check the one thing that
 * matters: a caller that omits `mode` still reaches the native module with
 * `'remind'`, not `undefined`.
 */
describe("startFocus's mode argument, forced onto the Android path", () => {
  afterEach(() => {
    jest.dontMock('react-native');
    jest.dontMock('../../../modules/app-watch/src/AppWatchModule');
    jest.resetModules();
  });

  it('defaults to remind when the caller omits it', () => {
    // A minimal stand-in, not `{ ...jest.requireActual('react-native'), ... }`:
    // `index.ts` only ever destructures `Platform` from this module, and
    // forcing the *real* `react-native` index to load fresh here (which
    // spreading the actual module via `resetModules` would) drags in
    // native-only globals (`TurboModuleRegistry`, `DevMenu`) that do not
    // exist in this Jest environment and throw before this test ever gets
    // to its assertion.
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    const nativeStartFocus = jest.fn();
    jest.doMock('../../../modules/app-watch/src/AppWatchModule', () => ({
      default: { startFocus: nativeStartFocus },
    }));

    // `resetModules` is what makes this `require` re-evaluate `index.ts`
    // against the two mocks above -- the top-of-file `import` already ran
    // once, on the real `Platform.OS`, and a plain `require` of the same
    // path would just hand back that already-evaluated (and already
    // `native = null`) copy.
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const androidAppWatch = require('../../../modules/app-watch');
    androidAppWatch.startFocus(['com.example.app'], 123);

    expect(nativeStartFocus).toHaveBeenCalledWith(['com.example.app'], 123, 'remind');
  });

  it('forwards an explicit lock mode unchanged', () => {
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    const nativeStartFocus = jest.fn();
    jest.doMock('../../../modules/app-watch/src/AppWatchModule', () => ({
      default: { startFocus: nativeStartFocus },
    }));

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const androidAppWatch = require('../../../modules/app-watch');
    androidAppWatch.startFocus(['com.example.app'], 123, 'lock');

    expect(nativeStartFocus).toHaveBeenCalledWith(['com.example.app'], 123, 'lock');
  });
});
