/**
 * Read once, at import time, so a missing variable fails the boot instead of
 * surfacing later as a confusing runtime error deep in a request handler.
 */
const need = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env ${k} — see server/.env.example`);
  return v;
};

export const ENV = {
  databaseUrl: need('DATABASE_URL'),
  jwtSecret: need('JWT_SECRET'),
  googleClientId: need('GOOGLE_CLIENT_ID'),
  port: Number(process.env.PORT ?? 8080),
};
