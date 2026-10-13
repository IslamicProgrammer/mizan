import { pullState, pushState, signInToServer } from '../api';

jest.mock('../env', () => ({
  getEnv: () => ({ apiUrl: 'http://test.local', googleClientId: 'test-client-id' }),
}));

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pushState', () => {
  it('resolves false instead of throwing when the network is down', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network request failed'));
    await expect(pushState('token', { a: 1 })).resolves.toBe(false);
  });

  it('resolves false on a 500 without throwing', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response);
    await expect(pushState('token', { a: 1 })).resolves.toBe(false);
  });

  it('resolves true on success', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ state: {} }) } as Response);
    await expect(pushState('token', { a: 1 })).resolves.toBe(true);
  });
});

describe('pullState', () => {
  it('resolves null instead of throwing when the network is down', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network request failed'));
    await expect(pullState('token')).resolves.toBeNull();
  });

  it('resolves null on a non-ok response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 401 } as Response);
    await expect(pullState('token')).resolves.toBeNull();
  });

  it('resolves the server state on success', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ state: { history: {} } }) } as Response);
    await expect(pullState('token')).resolves.toEqual({ history: {} });
  });
});

describe('signInToServer', () => {
  it('resolves null instead of throwing when the network is down', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network request failed'));
    await expect(signInToServer('id-token')).resolves.toBeNull();
  });

  it('resolves null when the server rejects the idToken', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 401 } as Response);
    await expect(signInToServer('id-token')).resolves.toBeNull();
  });

  it('resolves the token and userId on success', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'jwt-abc', userId: 'u1' }),
    } as Response);
    await expect(signInToServer('id-token')).resolves.toEqual({ token: 'jwt-abc', userId: 'u1' });
  });
});
