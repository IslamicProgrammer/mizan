import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { verifyToken } from '../auth/token.js';
import { pool } from '../db.js';
import { mergeHistoryWithDrops, type History } from '../sync/merge.js';

const Body = z.object({ state: z.record(z.string(), z.unknown()) });

/**
 * Resolves to null for anything short of a well-formed `Bearer <jwt>` header
 * naming a token we issued and still consider valid — a missing header, a
 * header that is not the Bearer scheme, and a forged or expired token all
 * collapse to the same "unauthorized" outcome so none of them leaks which
 * case it was.
 */
async function userIdFrom(req: FastifyRequest): Promise<string | null> {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  return (await verifyToken(h.slice(7)))?.userId ?? null;
}

/**
 * `incoming.history` arrives as `unknown` from the request body — it is
 * whatever the client's JSON happened to contain, not something we can trust
 * to already match `History`. Pulling it out as an untyped value and letting
 * `mergeHistory`'s own sanitizing reject anything malformed is what keeps a
 * bad payload from one device out of the record both devices share, rather
 * than trusting a cast at this call site.
 */
function historyOf(state: Record<string, unknown>): History {
  const h = state.history;
  return typeof h === 'object' && h !== null ? (h as History) : {};
}

export async function profileRoutes(app: FastifyInstance) {
  app.get('/profile', async (req, reply) => {
    const userId = await userIdFrom(req);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });

    const { rows } = await pool.query<{ state: Record<string, unknown> }>(
      'select state from profiles where user_id = $1',
      [userId],
    );
    return { state: rows[0]?.state ?? {} };
  });

  app.put('/profile', async (req, reply) => {
    const userId = await userIdFrom(req);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'state required' });

    const incoming = parsed.data.state;

    // The read, the merge, and the write must be one atomic unit: this
    // handler is the reason the merge lives on the server rather than on
    // each device, and without the transaction two concurrent syncs could
    // both read the same pre-merge row, compute independent merges, and
    // have the second write silently discard the first.
    const client = await pool.connect();
    try {
      await client.query('begin');
      // FOR UPDATE makes the second concurrent sync wait for the first to
      // commit, so it merges against the result rather than against a row
      // that is already stale by the time it writes. Every query below must
      // go through `client`, not `pool` — a query on `pool` takes a
      // different connection and would silently escape this lock.
      const { rows } = await client.query<{ state: Record<string, unknown> }>(
        'select state from profiles where user_id = $1 for update',
        [userId],
      );
      const remote = rows[0]?.state ?? {};

      const { history, dropped } = mergeHistoryWithDrops(historyOf(incoming), historyOf(remote));

      // Non-history fields are simple last-write-wins: the merge rule exists
      // for prayer history specifically, because that is the data a stale
      // device could otherwise erase. Everything else in `state` is whatever
      // the calling device just saved, so it overwrites remote as a normal
      // write would.
      const merged: Record<string, unknown> = { ...remote, ...incoming, history };

      await client.query(
        `insert into profiles (user_id, state, updated_at) values ($1, $2, now())
         on conflict (user_id) do update set state = excluded.state, updated_at = now()`,
        [userId, merged],
      );
      await client.query('commit');
      return { state: merged, dropped };
    } catch (e) {
      await client.query('rollback').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  });
}
