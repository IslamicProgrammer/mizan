import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyToken } = vi.hoisted(() => ({ verifyToken: vi.fn() }));
vi.mock('../auth/token.js', () => ({ verifyToken }));

// GET /profile still queries `pool` directly — no transaction needed for a
// read-only path. PUT /profile needs a checked-out client so the select,
// merge, and upsert share one connection and one row lock; `clientQuery`
// inspects the SQL to decide what to hand back, so tests don't have to track
// exactly which call index is the `for update` select versus `begin`/`commit`.
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
const { clientQuery, clientRelease, connect, txState } = vi.hoisted(() => {
  const txState: { selectRows: Array<{ state: Record<string, unknown> }> } = { selectRows: [] };
  const clientQuery = vi.fn(async (sql: string, _params?: unknown[]) => {
    if (typeof sql === 'string' && sql.includes('for update')) {
      return { rows: txState.selectRows };
    }
    return { rows: [] };
  });
  const clientRelease = vi.fn();
  const connect = vi.fn(async () => ({ query: clientQuery, release: clientRelease }));
  return { clientQuery, clientRelease, connect, txState };
});
vi.mock('../db.js', () => ({ pool: { query, connect } }));

import { profileRoutes } from '../routes/profile.js';

// vitest does not reset mock call history between tests on its own, and
// several tests here assert "not called" or inspect a specific call index —
// without this, a passing assertion in one test can depend on leftover calls
// from whichever test happened to run before it.
beforeEach(() => {
  vi.clearAllMocks();
  txState.selectRows = [];
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
    expect(connect).not.toHaveBeenCalled();
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
    expect(connect).not.toHaveBeenCalled();
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
    expect(connect).not.toHaveBeenCalled();
  });

  it('merges the incoming history with the stored one instead of overwriting it', async () => {
    verifyToken.mockResolvedValueOnce({ userId: 'user-1' });
    txState.selectRows = [{ state: { history: { '2026-10-01': { kept: 2 }, '2026-10-02': { kept: 1 } } } }];
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
      dropped: [],
    });

    // The merge, the select, and the upsert all go through the one checked-out
    // client rather than the bare pool — that is what keeps the row locked
    // for the lifetime of the transaction.
    expect(connect).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
    const sqlCalls = clientQuery.mock.calls.map((c) => c[0]);
    expect(sqlCalls[0]).toBe('begin');
    expect(sqlCalls.some((s) => typeof s === 'string' && s.includes('for update'))).toBe(true);
    expect(sqlCalls.some((s) => typeof s === 'string' && s.includes('insert into profiles'))).toBe(true);
    expect(sqlCalls.at(-1)).toBe('commit');
    expect(clientRelease).toHaveBeenCalledTimes(1);

    // The merged state, not the raw incoming body, is what gets persisted.
    const upsertCall = clientQuery.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('insert into profiles'));
    expect(upsertCall?.[1]?.[0]).toBe('user-1');
    expect(upsertCall?.[1]?.[1]).toEqual(res.json().state);
  });

  it('keeps a remote rest day alive even when incoming has no history at all', async () => {
    verifyToken.mockResolvedValueOnce({ userId: 'user-1' });
    txState.selectRows = [{ state: { history: { '2026-10-01': { kept: 0, rest: true } } } }];
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/profile',
      headers: { authorization: 'Bearer good' },
      payload: { state: {} },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      state: { history: { '2026-10-01': { kept: 0, rest: true } } },
      dropped: [],
    });
  });

  it('reports dropped keys alongside state instead of silently discarding them', async () => {
    verifyToken.mockResolvedValueOnce({ userId: 'user-1' });
    txState.selectRows = [{ state: { history: {} } }];
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/profile',
      headers: { authorization: 'Bearer good' },
      payload: { state: { history: { 'not-a-date': { kept: 9 }, '2026-10-01': { kept: 2 } } } },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      state: { history: { '2026-10-01': { kept: 2 } } },
      dropped: ['not-a-date'],
    });
  });

  it('releases the client even when the upsert throws', async () => {
    verifyToken.mockResolvedValueOnce({ userId: 'user-1' });
    txState.selectRows = [{ state: {} }];
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('insert into profiles')) throw new Error('boom');
      if (sql.includes('for update')) return { rows: txState.selectRows };
      return { rows: [] };
    });
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/profile',
      headers: { authorization: 'Bearer good' },
      payload: { state: { history: {} } },
    });

    expect(res.statusCode).toBe(500);
    expect(clientRelease).toHaveBeenCalledTimes(1);
    const sqlCalls = clientQuery.mock.calls.map((c) => c[0]);
    expect(sqlCalls).toContain('rollback');
  });
});
