import { describe, expect, it } from 'vitest';
import { issueToken, verifyToken } from '../auth/token.js';

describe('token', () => {
  it('round-trips the user id', async () => {
    const t = await issueToken('user-1');
    expect(await verifyToken(t)).toEqual({ userId: 'user-1' });
  });

  it('rejects a token signed with a different secret', async () => {
    expect(await verifyToken('eyJhbGciOiJIUzI1NiJ9.e30.bad-signature')).toBeNull();
  });

  it('rejects garbage without throwing', async () => {
    expect(await verifyToken('not-a-jwt')).toBeNull();
  });

  it('rejects an already-expired token', async () => {
    const t = await issueToken('user-1', -60);
    expect(await verifyToken(t)).toBeNull();
  });
});
