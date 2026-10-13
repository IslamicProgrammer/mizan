/**
 * Thin network calls against our own server, nothing else. Sync is
 * best-effort by design: this app must work with no network at 05:00, so
 * every call here resolves rather than rejects — a failed push is retried
 * on the next launch (or the next time `useSession` syncs), and the user is
 * never told. Callers build the request body themselves (`auth.ts`'s
 * `buildSyncBody`, from `stateForSync`, never from raw `state`) — this
 * module stays unaware of our `State` shape so it cannot grow a shortcut
 * back to it.
 */
import { getEnv } from './env';

export async function pushState(token: string, state: unknown): Promise<boolean> {
  try {
    const r = await fetch(`${getEnv().apiUrl}/profile`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ state }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function pullState(token: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(`${getEnv().apiUrl}/profile`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return (await r.json()).state ?? null;
  } catch {
    return null;
  }
}

/** `POST /auth/google`: trades a Google ID token for our own JWT. Null on
 * any failure — a bad idToken, no network, the server being down — so the
 * caller can show one honest sentence rather than a raw provider error. */
export async function signInToServer(idToken: string): Promise<{ token: string; userId: string } | null> {
  try {
    const r = await fetch(`${getEnv().apiUrl}/auth/google`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!r.ok) return null;
    const body = await r.json();
    if (typeof body?.token !== 'string' || typeof body?.userId !== 'string') return null;
    return { token: body.token, userId: body.userId };
  } catch {
    return null;
  }
}
