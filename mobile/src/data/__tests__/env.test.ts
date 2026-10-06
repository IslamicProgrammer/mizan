import { readEnv } from '../env';

describe('readEnv', () => {
  it('returns the config when every variable is present', () => {
    expect(readEnv({ EXPO_PUBLIC_API_URL: 'https://api.mizan.app' })).toEqual({
      apiUrl: 'https://api.mizan.app',
    });
  });

  it('names the missing variable in the error', () => {
    expect(() => readEnv({})).toThrow(/EXPO_PUBLIC_API_URL/);
  });

  it('rejects an empty string, which dotenv produces for a blank line', () => {
    expect(() => readEnv({ EXPO_PUBLIC_API_URL: '' })).toThrow(/EXPO_PUBLIC_API_URL/);
  });
});
