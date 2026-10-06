/**
 * Read once, at import time, so a missing variable fails the boot instead of
 * surfacing later as a confusing runtime error deep in a request handler.
 */
const need = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env ${k} — see server/.env.example`);
  return v;
};

/**
 * HS256 is only as strong as the secret, and a short one is recoverable offline
 * from a single captured token — after which anybody can mint a token for any
 * user. 32 bytes is the floor because that is the output size of the hash the
 * signature is built on; below it, length is the weakest part of the scheme.
 */
const needLong = (k: string, min: number): string => {
  const v = need(k);
  if (v.length < min) {
    throw new Error(`${k} must be at least ${min} characters — generate one with: openssl rand -base64 48`);
  }
  return v;
};

export const ENV = {
  databaseUrl: need('DATABASE_URL'),
  jwtSecret: needLong('JWT_SECRET', 32),
  googleClientId: need('GOOGLE_CLIENT_ID'),
  port: Number(process.env.PORT ?? 8080),
};
