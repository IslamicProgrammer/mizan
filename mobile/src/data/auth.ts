/**
 * The account gate: Google sign-in, and the best-effort sync that rides
 * along with it.
 *
 * The session this app cares about is our own JWT, never Google's cached
 * sign-in state — that is only a UI convenience for the picker. The token
 * lives in `expo-secure-store`, the same place `store.tsx` keeps cycle
 * data, not `AsyncStorage`: AsyncStorage is plaintext in the app's private
 * directory and swept into Android Auto Backup, and a stolen backup should
 * not hand over a working session.
 *
 * Everything in this file must work with no account and no network — Review
 * Focus #1. Signing in is how you keep your history, not a gate on using
 * the app: every function below resolves rather than throws, and nothing
 * here is on the path any other screen renders through.
 */
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';

import { pullState, pushState, signInToServer } from './api';
import { getEnv } from './env';

import { FIVE } from './prayer';
import { stateForSync, useStore, ymd, type DayRecord, type State } from './store';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let googleModule: GoogleSigninModule | null | undefined;

/**
 * Loaded through a guarded `require`, and tolerated when it is absent.
 *
 * `@react-native-google-signin` is a native module, so importing it throws
 * ("RNGoogleSignin could not be found") in any binary that does not contain
 * it — Expo Go, or a development build made before it was installed. A static
 * import does not merely disable sign-in, it takes the whole app down: this
 * module never finishes evaluating, and `src/app/index.tsx` imports it, so
 * every screen disappears. This project has hit that exact failure twice now,
 * here and with expo-notifications.
 *
 * `require` rather than `await import()` because Jest's CommonJS environment
 * refuses a dynamic import without --experimental-vm-modules, which would make
 * this path untestable — and an untested guard is how the bug comes back.
 */
function loadGoogle(): GoogleSigninModule | null {
  if (googleModule !== undefined) return googleModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    googleModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    googleModule = null;
  }
  return googleModule;
}

const TOKEN_KEY = 'mizan.auth.token.v1';

const KIRISH_ERROR = "Kirib bo'lmadi. Internetni tekshiring va qayta urining.";

/**
 * Shown only when the binary has no Google sign-in module at all — Expo Go, or
 * a development build made before it was installed. It is not a failure the
 * user can do anything about, so it says so plainly rather than suggesting
 * they check their connection.
 */
const NO_SIGNIN_BUILD = "Bu versiyada hisobga kirish mavjud emas.";

/**
 * `SecureStore` is backed by native Keystore/Keychain, which does not exist
 * on web — and `npm run smoke` mounts every route in react-native-web.
 * Treating that absence as "no session" rather than letting the native call
 * reject is what lets every route render signed out, the same guard
 * `store.tsx` applies to `cycles`.
 */
async function secureAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function getToken(): Promise<string | null> {
  try {
    if (!(await secureAvailable())) return null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setToken(token: string): Promise<void> {
  try {
    if (await secureAvailable()) await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // The user is still signed in for this run of the app; the next launch
    // simply asks again rather than crashing over a storage write.
  }
}

async function clearToken(): Promise<void> {
  try {
    if (await secureAvailable()) await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Nothing left to clear if the read/write path is already unavailable.
  }
}

/**
 * The `PUT /profile` request body — the one load-bearing rule from Task 8's
 * amendment.
 *
 * Built from `stateForSync`, never from `state` directly: `cycles` is health
 * data the app promises never leaves the phone, and `stateForSync` is the one
 * place that promise is structural rather than a convention this function
 * would otherwise have to remember.
 *
 * Today is synthesized into the sent `history` because `state.history`
 * itself never contains today's key — `store.tsx` only archives it at
 * midnight roll-over. Forwarding `state.history` unmodified would never send
 * today at all, leaving the server's `updatedAt` correction mechanism inert
 * on the one day a mis-tap is actually noticed. `updatedAt` is omitted
 * entirely rather than set to `undefined` when `marksUpdatedAt` is absent —
 * `exactOptionalPropertyTypes` treats an explicit `undefined` as a different
 * shape from a missing key.
 */
export function buildSyncBody(state: State): Omit<State, 'cycles'> {
  const synced = stateForSync(state);
  const today = ymd(new Date());
  const prayers = FIVE.filter((p) => state.marks[p] === 'done' || state.marks[p] === 'late');
  const todayRecord: DayRecord =
    state.marksUpdatedAt !== undefined
      ? { kept: prayers.length, prayers, updatedAt: state.marksUpdatedAt }
      : { kept: prayers.length, prayers };
  return { ...synced, history: { ...synced.history, [today]: todayRecord } };
}

type Store = ReturnType<typeof useStore>;

/**
 * Push, then pull. The push hands the server this device's own current
 * history to merge; the pull brings the merged result back down, which is
 * what actually restores a day another device recorded. Applying the
 * response is safe for every OTHER field too — the server's merge is plain
 * last-write-wins there, so what comes back is simply this device's own
 * data reflected — but only `history` is adopted (`applyRemoteHistory`),
 * because that is the one field this round trip can enrich without risking
 * a stale device's defaults clobbering something real.
 *
 * Every step is allowed to fail silently: offline, a 500, a torn-down app
 * mid-request. There is no retry loop here on purpose — the next app launch
 * (or the next sign-in) tries again, same as `pushState`'s own contract.
 */
async function syncNow(token: string, store: Store): Promise<void> {
  const pushed = await pushState(token, buildSyncBody(store));
  if (!pushed) return;
  const remote = await pullState(token);
  const remoteHistory = remote?.history;
  if (remoteHistory && typeof remoteHistory === 'object') {
    store.applyRemoteHistory(remoteHistory as Record<string, DayRecord>);
  }
}

// Module-level, not per-component: `useSession()` is called from several
// independent screens (index, settings, profile), and each would otherwise
// run its own redundant push+pull the moment it mounts. One sync per token
// per app launch is the "retried on next launch" contract `pushState`
// documents — not once per screen visited.
let syncedForToken: string | null = null;

export type Session = { token: string } | null;

/** The account gate's one read: a token in SecureStore, or none. */
export function useSession(): { session: Session; loading: boolean } {
  const store = useStore();
  const [token, setTok] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  useEffect(() => {
    let live = true;
    getToken().then((t) => {
      if (!live) return;
      setTok(t);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!token || syncedForToken === token) return;
    syncedForToken = token;
    // Fire-and-forget: a slow or failed sync must never block a screen that
    // is only waiting on `loading` to decide what to render.
    syncNow(token, storeRef.current).catch(() => {});
  }, [token]);

  return { session: token ? { token } : null, loading };
}

/**
 * Signs in with Google, then signs in to our own server. Returns `null` on
 * success or on a plain cancel (the user closing the picker is not an
 * error), and one honest Uzbek sentence — never a raw provider error — for
 * every other failure, so the sign-in screen has exactly one thing to show.
 */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    const google = loadGoogle();
    if (!google) return NO_SIGNIN_BUILD;
    const { GoogleSignin } = google;
    GoogleSignin.configure({ webClientId: getEnv().googleClientId });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (result.type !== 'success') return null;
    const idToken = result.data.idToken;
    if (!idToken) return KIRISH_ERROR;

    const auth = await signInToServer(idToken);
    if (!auth) return KIRISH_ERROR;

    await setToken(auth.token);
    return null;
  } catch {
    return KIRISH_ERROR;
  }
}

/**
 * Clears our own session. Local prayer history is untouched — signing out
 * is not the same action as `reset()`'s full wipe, and conflating the two
 * would delete a real user's data on a tap meant only to switch accounts.
 */
export async function signOut(): Promise<void> {
  await clearToken();
  syncedForToken = null;
  try {
    const google = loadGoogle();
    if (google) await google.GoogleSignin.signOut();
  } catch {
    // Our own token is already gone, which is what makes the user signed
    // out from this app's point of view regardless of Google's own cache.
  }
}
