import { describe, expect, it, vi } from 'vitest';

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(function MockOAuth2Client() {
    return { verifyIdToken };
  }),
}));

import { verifyGoogleIdToken } from '../auth/google.js';

describe('verifyGoogleIdToken', () => {
  it('returns null when the verifier throws', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('invalid_token'));
    expect(await verifyGoogleIdToken('bad')).toBeNull();
  });

  it('returns null when the payload has no sub', async () => {
    verifyIdToken.mockResolvedValueOnce({ getPayload: () => ({}) });
    expect(await verifyGoogleIdToken('no-sub')).toBeNull();
  });

  it('returns the user for a good payload', async () => {
    verifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ sub: 'google-sub-1', email: 'a@example.com' }),
    });
    expect(await verifyGoogleIdToken('good')).toEqual({ sub: 'google-sub-1', email: 'a@example.com' });
  });
});
