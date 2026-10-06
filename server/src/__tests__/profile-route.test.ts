import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyToken } = vi.hoisted(() => ({ verifyToken: vi.fn() }));
vi.mock('../auth/token.js', () => ({ verifyToken }));

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../db.js', () => ({ pool: { query } }));

import { profileRoutes } from '../routes/profile.js';

// vitest does not reset mock call history between tests on its own, and
// several tests here assert "not called" or inspect a specific call index —
// without this, a passing assertion in one test can depend on leftover calls
// from whichever test happened to run before it.
beforeEach(() => {
  vi.clearAllMocks();
});

async function buildApp() {
  const app = Fastify();
  await app.register(profileRoutes);
  return app;
}

describe('GET /profile', () => {
  it('refuses a request with no Authorization header', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/profile' });
    expect(res.statusCode).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('refuses a header that is not the Bearer scheme', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('refuses a forged or expired token', async () => {
    verifyToken.mockResolvedValueOnce(null);
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: 'Bearer forged.token.here' },
    });
    expect(res.statusCode).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('returns the stored state for a valid token', async () => {
    verifyToken.mockResolvedValueOnce({ userId: 'user-1' });
    query.mockResolvedValueOnce({ rows: [{ state: { history: { '2026-10-01': { kept: 5 } } } }] });
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: 'Bearer good' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ state: { history: { '2026-10-01': { kept: 5 } } } });
  });

  it('returns an empty state for a user with no profile row yet', async () => {
    verifyToken.mockResolvedValueOnce({ userId: 'user-1' });
    query.mockResolvedValueOnce({ rows: [] });
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: 'Bearer good' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ state: {} });
  });
});

describe('PUT /profile', () => {
  it('refuses a request with no Authorization header', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'PUT', url: '/profile', payload: { state: {} } });
    expect(res.statusCode).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('refuses a forged token even with a well-formed body', async () => {
    verifyToken.mockResolvedValueOnce(null);
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/profile',
      headers: { authorization: 'Bearer forged' },
      payload: { state: { history: {} } },
    });
    expect(res.statusCode).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a body with no state field', async () => {
    verifyToken.mockResolvedValueOnce({ userId: 'user-1' });
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/profile',
      headers: { authorization: 'Bearer good' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('merges the incoming history with the stored one instead of overwriting it', async () => {
    verifyToken.mockResolvedValueOnce({ userId: 'user-1' });
    query.mockResolvedValueOnce({
      rows: [{ state: { history: { '2026-10-01': { kept: 2 }, '2026-10-02': { kept: 1 } } } }],
    }); // select
    query.mockResolvedValueOnce({ rows: [] }); // upsert
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/profile',
      headers: { authorization: 'Bearer good' },
      payload: { state: { history: { '2026-10-01': { kept: 5 }, '2026-10-03': { kept: 1 } } } },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      state: {
        history: {
          '2026-10-01': { kept: 5 }, // higher of the two
          '2026-10-02': { kept: 1 }, // only on the remote side
          '2026-10-03': { kept: 1 }, // only on the incoming side
        },
      },
    });

    // The merged state, not the raw incoming body, is what gets persisted.
    const upsertCall = query.mock.calls[1];
    expect(upsertCall?.[1]?.[0]).toBe('user-1');
    expect(upsertCall?.[1]?.[1]).toEqual(res.json().state);
  });

  it('keeps a remote rest day alive even when incoming has no history at all', async () => {
    verifyToken.mockResolvedValueOnce({ userId: 'user-1' });
    query.mockResolvedValueOnce({
      rows: [{ state: { history: { '2026-10-01': { kept: 0, rest: true } } } }],
    });
    query.mockResolvedValueOnce({ rows: [] });
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/profile',
      headers: { authorization: 'Bearer good' },
      payload: { state: {} },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ state: { history: { '2026-10-01': { kept: 0, rest: true } } } });
  });
});
