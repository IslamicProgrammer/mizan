import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

import { ENV } from './env.js';
import { pendingMigrations } from './migrations.js';

export const pool = new Pool({ connectionString: ENV.databaseUrl });

export async function migrate(dir = join(import.meta.dirname, '../migrations')): Promise<void> {
  await pool.query(
    'create table if not exists _migrations (name text primary key, applied_at timestamptz default now())',
  );
  const { rows } = await pool.query<{ name: string }>('select name from _migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
  for (const name of pendingMigrations(files, rows.map((r) => r.name))) {
    const sql = readFileSync(join(dir, name), 'utf8');
    // one transaction per migration: a half-applied schema is worse than none
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into _migrations (name) values ($1)', [name]);
      await client.query('commit');
      console.log(`migrated ${name}`);
    } catch (e) {
      // A dead connection makes the rollback throw too. Let the original failure
      // be the one that propagates; the transaction is already lost either way.
      await client.query('rollback').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }
}
