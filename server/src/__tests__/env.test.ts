import { describe, expect, it } from 'vitest';
import { readEnv } from '../env.js';

const ok = {
  DATABASE_URL: 'postgres://u@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
  GOOGLE_CLIENT_ID: 'client',
  GEMINI_API_KEY: 'gemini-key',
};

describe('readEnv', () => {
  it('reads every value and defaults the port to 8080', () => {
    expect(readEnv(ok)).toEqual({
      databaseUrl: ok.DATABASE_URL,
      jwtSecret: ok.JWT_SECRET,
      googleClientId: 'client',
      scanPublic: false,
      scanDailyMax: 500,
      geminiApiKey: 'gemini-key',
      port: 8080,
    });
  });

  it('takes PORT when it is set', () => {
    expect(readEnv({ ...ok, PORT: '3001' }).port).toBe(3001);
  });

  it('names the variable that is missing', () => {
    expect(() => readEnv({ ...ok, DATABASE_URL: undefined })).toThrow('DATABASE_URL');
  });

  it('refuses a secret one character under the floor', () => {
    expect(() => readEnv({ ...ok, JWT_SECRET: 'x'.repeat(31) })).toThrow('at least 32');
  });

  it('accepts a secret exactly at the floor', () => {
    expect(() => readEnv({ ...ok, JWT_SECRET: 'x'.repeat(32) })).not.toThrow();
  });
});
