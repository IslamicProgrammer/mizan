import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const url = process.env.TEST_DATABASE_URL;

/**
 * Opt-in integration test: signing in twice with the same Google sub must
 * resolve to the same user row, not a duplicate-key error and not a second
 * row. That is a property of Postgres's `on conflict` handling, not of our
 * code, so mocking the driver would just restate the SQL as an assertion —
 * it needs a real database. Runs its own pool against TEST_DATABASE_URL
 * rather than the app's `pool`, so the rest of the suite never needs a
 * database to pass.
 */
describe.skipIf(!url)('profile upsert (requires TEST_DATABASE_URL)', () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    if (!url) return;
    pool = new pg.Pool({ connectionString: url });
    const sql = readFileSync(join(import.meta.dirname, '../../migrations/0001_profiles.sql'), 'utf8');
    await pool.query(sql);
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query('drop table if exists profiles, users cascade');
    await pool.end();
  });

  it('signing in twice with the same google sub yields the same id and a single row', async () => {
    const upsertUser = () =>
      pool.query<{ id: string }>(
        `insert into users (google_sub, email) values ($1, $2)
         on conflict (google_sub) do update set email = excluded.email
         returning id`,
        ['sub-upsert-test', 'a@example.com'],
      );

    const first = await upsertUser();
    const second = await upsertUser();

    const firstRow = first.rows[0];
    const secondRow = second.rows[0];
    expect(firstRow).toBeDefined();
    expect(secondRow).toBeDefined();
    expect(secondRow?.id).toBe(firstRow?.id);

    const { rows } = await pool.query<{ count: number }>(
      'select count(*)::int as count from users where google_sub = $1',
      ['sub-upsert-test'],
    );
    expect(rows[0]?.count).toBe(1);

    // The profiles upsert the route also runs must stay equally idempotent.
    const upsertProfile = () =>
      pool.query('insert into profiles (user_id) values ($1) on conflict (user_id) do nothing', [firstRow?.id]);
    await upsertProfile();
    await upsertProfile();

    const { rows: profileRows } = await pool.query<{ count: number }>(
      'select count(*)::int as count from profiles where user_id = $1',
      [firstRow?.id],
    );
    expect(profileRows[0]?.count).toBe(1);
  });
});
