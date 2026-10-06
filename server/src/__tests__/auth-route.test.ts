import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

const { verifyGoogleIdToken } = vi.hoisted(() => ({ verifyGoogleIdToken: vi.fn() }));
vi.mock('../auth/google.js', () => ({ verifyGoogleIdToken }));

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../db.js', () => ({ pool: { query } }));

import { authRoutes } from '../routes/auth.js';
import { verifyToken } from '../auth/token.js';

async function buildApp() {
  const app = Fastify();
  await app.register(authRoutes);
  return app;
}

describe('POST /auth/google', () => {
  it('rejects a token the verifier does not vouch for, with no token in the body', async () => {
    verifyGoogleIdToken.mockResolvedValueOnce(null);
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/auth/google', payload: { idToken: 'bad' } });

    expect(res.statusCode).toBe(401);
    expect(res.json()).not.toHaveProperty('token');
  });

  it('rejects a body that is not an object', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/auth/google',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify('not-an-object'),
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a body with no idToken', async () => {
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/auth/google', payload: {} });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a body whose idToken is not a string', async () => {
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/auth/google', payload: { idToken: 123 } });

    expect(res.statusCode).toBe(400);
  });

  it('issues a token this server accepts, end to end, for a token the verifier accepts', async () => {
    verifyGoogleIdToken.mockResolvedValueOnce({ sub: 'google-sub-1', email: 'a@example.com' });
    query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] }); // users upsert
    query.mockResolvedValueOnce({ rows: [] }); // profiles insert
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/auth/google', payload: { idToken: 'good' } });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { token: string; userId: string };
    expect(body.userId).toBe('user-1');
    expect(typeof body.token).toBe('string');
    // This is the assertion that matters: the route must issue a token this
    // server will actually accept, without a database or Google involved.
    expect(await verifyToken(body.token)).toEqual({ userId: 'user-1' });
  });
});
