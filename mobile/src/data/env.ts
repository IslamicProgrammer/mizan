/**
 * Env is read once, here, and a missing value throws immediately with the
 * variable's name. An undefined that leaks into a client surfaces later as an
 * unrelated network error, which is a much worse hour to spend.
 */
type Raw = Record<string, string | undefined>;

export type Env = { apiUrl: string };

export function readEnv(raw: Raw): Env {
  const need = (key: string): string => {
    const v = raw[key];
    if (!v) throw new Error(`Missing env ${key} — copy mobile/.env.example to mobile/.env`);
    return v;
  };
  return {
    apiUrl: need('EXPO_PUBLIC_API_URL'),
  };
}

export const ENV: Env = readEnv(process.env as Raw);
