/**
 * Env is read once, here, and a missing value throws immediately with the
 * variable's name. An undefined that leaks into a client surfaces later as an
 * unrelated network error, which is a much worse hour to spend.
 */
type Raw = Record<string, string | undefined>;

export type Env = { apiUrl: string; googleClientId: string };

export function readEnv(raw: Raw): Env {
  const need = (key: string): string => {
    const v = raw[key];
    if (!v) throw new Error(`Missing env ${key} — copy mobile/.env.example to mobile/.env`);
    return v;
  };
  return {
    apiUrl: need('EXPO_PUBLIC_API_URL'),
    // The Web client ID — audience the server verifies against, and
    // `webClientId` for @react-native-google-signin/google-signin. It is
    // public (it ships inside the APK), unlike the server's JWT secret.
    googleClientId: need('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
  };
}

/**
 * Expo inlines an env var only where the source literally spells
 * `process.env.EXPO_PUBLIC_NAME` as a member expression. Reading it through a
 * string key — or handing the whole `process.env` to a helper — leaves nothing
 * for Metro to substitute, and the value is then absent on device: there is no
 * OS environment inside Hermes. So every variable this app reads is named
 * here, literally, exactly once.
 */
const RAW: Raw = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
};

let cached: Env | undefined;

/**
 * Lazy and memoised: importing this module for `readEnv` or for its types must
 * not require a configured environment. Startup still fails fast, because the
 * app's root layout calls this before anything renders.
 */
export function getEnv(): Env {
  if (!cached) cached = readEnv(RAW);
  return cached;
}
