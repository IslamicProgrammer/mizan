import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Fastify from 'fastify';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const url = process.env.TEST_DATABASE_URL;

/**
 * The race this test exists to close only shows up across two real
 * connections contending for the same row — a mocked driver has nothing to
 * contend with, so this needs a live Postgres. `../db.js` is mocked to swap
 * in a real `pg.Pool` aimed at TEST_DATABASE_URL (rather than requiring
 * DATABASE_URL itself to point at the test cluster, which the rest of the
 * suite depends on staying a dummy value), so the route under test —
 * unmodified — talks to a real database through its own `pool`. The factory
 * only runs the first time something imports '../db.js', which this file
 * does lazily inside beforeAll, after `url` is already assigned.
 */
vi.mock('../db.js', () => ({
  pool: url ? new pg.Pool({ connectionString: url }) : undefined,
}));

describe.skipIf(!url)('PUT /profile concurrency (requires TEST_DATABASE_URL)', () => {
  let pool: pg.Pool;
  let userId: string;
  let token: string;

  beforeAll(async () => {
    ({ pool } = await import('../db.js'));
    const sql = readFileSync(join(import.meta.dirname, '../../migrations/0001_profiles.sql'), 'utf8');
    await pool.query(sql);

    const { issueToken } = await import('../auth/token.js');
    // `profiles.user_id` is a foreign key into `users`, so this needs a real
    // user row to hang the profile off, not an arbitrary string.
    const googleSub = `concurrency-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const { rows } = await pool.query<{ id: string }>(
      'insert into users (google_sub) values ($1) returning id',
      [googleSub],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error('failed to create test user');
    userId = id;
    token = await issueToken(userId);
    await pool.query('insert into profiles (user_id, state, updated_at) values ($1, $2, now())', [userId, {}]);
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query('delete from profiles where user_id = $1', [userId]);
    await pool.query('delete from users where id = $1', [userId]);
    await pool.end();
  });

  it('keeps both days when two devices sync at the same time, repeatedly', async () => {
    const { profileRoutes } = await import('../routes/profile.js');
    const app = Fastify();
    await app.register(profileRoutes);

    // Run several rounds rather than once — a race that only sometimes loses
    // is exactly the kind a single pass can miss by luck.
    const attempts = 5;
    for (let i = 0; i < attempts; i++) {
      const dayA = `2026-01-${String(10 + i).padStart(2, '0')}`;
      const dayB = `2026-02-${String(10 + i).padStart(2, '0')}`;

      const [resA, resB] = await Promise.all([
        app.inject({
          method: 'PUT',
          url: '/profile',
          headers: { authorization: `Bearer ${token}` },
          payload: { state: { history: { [dayA]: { kept: 3 } } } },
        }),
        app.inject({
          method: 'PUT',
          url: '/profile',
          headers: { authorization: `Bearer ${token}` },
          payload: { state: { history: { [dayB]: { kept: 4 } } } },
        }),
      ]);

      expect(resA.statusCode).toBe(200);
      expect(resB.statusCode).toBe(200);

      const { rows } = await pool.query<{ state: { history?: Record<string, unknown> } }>(
        'select state from profiles where user_id = $1',
        [userId],
      );
      const history = rows[0]?.state.history ?? {};
      // Both days must survive. Without the transaction + row lock, the
      // second write reads the row before the first commits and overwrites
      // it wholesale, silently losing whichever day it didn't itself send.
      expect(history).toHaveProperty(dayA);
      expect(history).toHaveProperty(dayB);
    }
  });
});
