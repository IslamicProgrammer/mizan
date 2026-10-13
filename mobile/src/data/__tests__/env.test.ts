import { getEnv, readEnv } from '../env';

const ok = {
  EXPO_PUBLIC_API_URL: 'https://api.mizan.app',
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
};

describe('readEnv', () => {
  it('returns the config when every variable is present', () => {
    expect(readEnv(ok)).toEqual({
      apiUrl: ok.EXPO_PUBLIC_API_URL,
      googleClientId: ok.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    });
  });

  it('names the missing variable in the error', () => {
    expect(() => readEnv({})).toThrow(/EXPO_PUBLIC_API_URL/);
  });

  it('names the missing google client id specifically, not just the first missing var', () => {
    expect(() => readEnv({ EXPO_PUBLIC_API_URL: ok.EXPO_PUBLIC_API_URL })).toThrow(
      /EXPO_PUBLIC_GOOGLE_CLIENT_ID/,
    );
  });

  it('rejects an empty string, which dotenv produces for a blank line', () => {
    expect(() => readEnv({ ...ok, EXPO_PUBLIC_API_URL: '' })).toThrow(/EXPO_PUBLIC_API_URL/);
  });
});

describe('getEnv', () => {
  it('throws, naming the variable, when it was not inlined at build time', () => {
    expect(() => getEnv()).toThrow('EXPO_PUBLIC_API_URL');
  });
});
