import { OAuth2Client } from 'google-auth-library';

import { ENV } from '../env.js';

const client = new OAuth2Client(ENV.googleClientId);

export type GoogleUser = { sub: string; email?: string };

/** Returns null for any token Google does not vouch for, for OUR client id. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUser | null> {
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: ENV.googleClientId });
    const p = ticket.getPayload();
    if (!p?.sub) return null;
    // Omit the key entirely rather than setting it to undefined: exactOptionalPropertyTypes
    // treats those as different shapes.
    return p.email ? { sub: p.sub, email: p.email } : { sub: p.sub };
  } catch {
    return null;
  }
}
