import { SignJWT, jwtVerify } from 'jose';

import { ENV } from '../env.js';

const key = new TextEncoder().encode(ENV.jwtSecret);
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function issueToken(userId: string, ttlSeconds = THIRTY_DAYS): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(key);
}

/**
 * Returns null for anything that is not a currently-valid token we signed.
 * Never throws: a throw in a request handler becomes a 500, and a 500 on an
 * expired token would make the app look broken instead of signed out.
 */
export async function verifyToken(jwt: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(jwt, key);
    return payload.sub ? { userId: String(payload.sub) } : null;
  } catch {
    return null;
  }
}
