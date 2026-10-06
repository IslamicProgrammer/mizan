type Raw = Record<string, string | undefined>;

export type Env = {
  databaseUrl: string;
  jwtSecret: string;
  googleClientId: string;
  port: number;
};

/**
 * Pure and exported so the rules below can be tested with explicit fixtures.
 * The JWT_SECRET floor in particular is a security control, and a control the
 * test suite cannot reach is one refactor away from quietly disappearing.
 */
export function readEnv(raw: Raw): Env {
  const need = (k: string): string => {
    const v = raw[k];
    if (!v) throw new Error(`Missing env ${k} — see server/.env.example`);
    return v;
  };

  /**
   * HS256 is only as strong as the secret, and a short one is recoverable
   * offline from a single captured token — after which anybody can mint a token
   * for any user. 32 is the floor because that is the output size of the hash
   * the signature is built on; below it, length is the weakest part of the
   * scheme.
   */
  const needLong = (k: string, min: number): string => {
    const v = need(k);
    if (v.length < min) {
      throw new Error(`${k} must be at least ${min} characters — generate one with: openssl rand -base64 48`);
    }
    return v;
  };

  return {
    databaseUrl: need('DATABASE_URL'),
    jwtSecret: needLong('JWT_SECRET', 32),
    googleClientId: need('GOOGLE_CLIENT_ID'),
    port: Number(raw.PORT ?? 8080),
  };
}

/**
 * Eager on purpose: a server with no configuration should refuse to boot rather
 * than fail later inside a request handler.
 */
export const ENV: Env = readEnv(process.env);
