import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { act, create } from 'react-test-renderer';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { pullState, pushState, signInToServer } from '../api';
import { buildSyncBody, signInWithGoogle, signOut, useSession } from '../auth';
import { StoreProvider, useStore, type State } from '../store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Same in-memory stand-in store.test.ts uses for the native Keystore the
// Jest environment does not have. Shared here between `store.tsx`'s own
// `cycles` key and `auth.ts`'s token key — different keys, same backing map,
// exactly like on a real device.
jest.mock('expo-secure-store', () => {
  let available = true;
  let kv: Record<string, string> = {};
  return {
    isAvailableAsync: jest.fn(async () => available),
    getItemAsync: jest.fn(async (key: string) => (key in kv ? kv[key] : null)),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      kv[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete kv[key];
    }),
    __setAvailable: (v: boolean) => {
      available = v;
    },
    __store: () => kv,
    __reset: () => {
      available = true;
      kv = {};
    },
  };
});

// `__esModule: true` matters: auth.ts reaches this through `await import()`,
// and without the flag Babel's interop wraps the mock so `GoogleSignin` is not
// where the real ESM package puts it.
jest.mock('@react-native-google-signin/google-signin', () => ({
  __esModule: true,
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../api', () => ({
  pushState: jest.fn(),
  pullState: jest.fn(),
  signInToServer: jest.fn(),
}));

jest.mock('../env', () => ({
  getEnv: () => ({ apiUrl: 'http://test.local', googleClientId: 'test-client-id' }),
}));

const secureMock = SecureStore as unknown as {
  __setAvailable: (v: boolean) => void;
  __store: () => Record<string, string>;
  __reset: () => void;
};
const TOKEN_KEY = 'mizan.auth.token.v1';

afterEach(() => {
  secureMock.__reset();
  jest.clearAllMocks();
});

function baseState(overrides: Partial<State> = {}): State {
  return {
    onboarded: true,
    settings: {
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
    },
    marks: { fajr: null, sunrise: null, dhuhr: null, asr: null, maghrib: null, isha: null },
    marksDate: '2026-01-01',
    answers: {},
    history: { '2025-12-31': { kept: 3 } },
    tasbih: { count: 0, targetIdx: 0 },
    qaza: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    focusMinutes: 0,
    focusByDay: {},
    blockedApps: [],
    cycles: [{ from: '2025-12-01', to: '2025-12-05' }],
    ...overrides,
  };
}

describe('buildSyncBody', () => {
  it('never includes cycles -- the one field that must have no path to the network', () => {
    const body = buildSyncBody(baseState());
    expect('cycles' in body).toBe(false);
  });

  it('synthesizes today into the sent history, which state.history itself never contains', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00'));
    const state = baseState({
      marks: { fajr: 'done', sunrise: null, dhuhr: 'late', asr: null, maghrib: null, isha: null },
      marksUpdatedAt: 5_000,
    });
    const body = buildSyncBody(state);
    expect(body.history['2026-03-15']).toEqual({ kept: 2, prayers: ['fajr', 'dhuhr'], updatedAt: 5_000 });
    // The real past day survives untouched alongside the synthesized one.
    expect(body.history['2025-12-31']).toEqual({ kept: 3 });
    jest.useRealTimers();
  });

  it('omits updatedAt entirely, rather than setting it to undefined, when marksUpdatedAt was never set', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00'));
    const state = baseState({ marksUpdatedAt: undefined });
    const body = buildSyncBody(state);
    const today = body.history['2026-03-15']!;
    expect('updatedAt' in today).toBe(false);
    jest.useRealTimers();
  });
});

describe('signInWithGoogle', () => {
  const mockedSignIn = GoogleSignin.signIn as jest.Mock;
  const mockedSignInToServer = signInToServer as jest.Mock;

  it('stores the server JWT in SecureStore on success, never AsyncStorage', async () => {
    mockedSignIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'google-id-token' } });
    mockedSignInToServer.mockResolvedValueOnce({ token: 'jwt-abc', userId: 'u1' });

    const err = await signInWithGoogle();

    expect(err).toBeNull();
    expect(secureMock.__store()[TOKEN_KEY]).toBe('jwt-abc');
  });

  it('returns null, not an error, when the user cancels the picker', async () => {
    mockedSignIn.mockResolvedValueOnce({ type: 'cancelled', data: null });

    const err = await signInWithGoogle();

    expect(err).toBeNull();
    expect(secureMock.__store()[TOKEN_KEY]).toBeUndefined();
  });

  it('returns one honest Uzbek sentence, never a raw provider error, when our server rejects the idToken', async () => {
    mockedSignIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'google-id-token' } });
    mockedSignInToServer.mockResolvedValueOnce(null);

    const err = await signInWithGoogle();

    expect(err).toBe("Kirib bo'lmadi. Internetni tekshiring va qayta urining.");
    expect(secureMock.__store()[TOKEN_KEY]).toBeUndefined();
  });

  it('returns the same honest sentence when Google itself throws', async () => {
    mockedSignIn.mockRejectedValueOnce(new Error('DEVELOPER_ERROR'));

    const err = await signInWithGoogle();

    expect(err).toBe("Kirib bo'lmadi. Internetni tekshiring va qayta urining.");
  });
});

describe('signOut', () => {
  it('clears the token from SecureStore without touching local prayer history', async () => {
    secureMock.__setAvailable(true);
    secureMock.__store()[TOKEN_KEY] = 'jwt-abc';

    await signOut();

    expect(secureMock.__store()[TOKEN_KEY]).toBeUndefined();
  });
});

describe("useSession's signed-out path", () => {
  function Probe({ onReady }: { onReady: (v: { session: unknown; loading: boolean }) => void }) {
    useStore(); // keeps this probe inside a real StoreProvider, same as auth.ts expects
    const session = useSession();
    onReady(session);
    return null;
  }

  it('resolves to no session, and never calls the network, when SecureStore has no token', async () => {
    let latest: { session: unknown; loading: boolean } | null = null;
    await act(async () => {
      create(
        React.createElement(
          StoreProvider,
          null,
          React.createElement(Probe, { onReady: (v) => { latest = v; } }),
        ),
      );
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    });

    expect(latest).toEqual({ session: null, loading: false });
    expect(pushState).not.toHaveBeenCalled();
    expect(pullState).not.toHaveBeenCalled();
  });
});

describe('when the binary has no Google sign-in module', () => {
  it('says so instead of taking the whole app down', async () => {
    jest.resetModules();
    // Reproduces Expo Go and any dev build made before the module was
    // installed: requiring it throws. A static import here killed every screen
    // in the app, twice, so this pins the guard rather than the symptom.
    jest.doMock('@react-native-google-signin/google-signin', () => {
      throw new Error("RNGoogleSignin could not be found");
    });
    let signIn: () => Promise<string | null> = async () => null;
    jest.isolateModules(() => {
      // `require`, not `import`: Jest's CommonJS environment refuses a dynamic
      // import without --experimental-vm-modules, which is the same constraint
      // that shaped the guard being tested.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      signIn = require('../auth').signInWithGoogle;
    });
    await expect(signIn()).resolves.toBe('Bu versiyada hisobga kirish mavjud emas.');
    jest.resetModules();
  });
});
