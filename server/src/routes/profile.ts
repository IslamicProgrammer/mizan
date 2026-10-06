import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { verifyToken } from '../auth/token.js';
import { pool } from '../db.js';
import { mergeHistory, type History } from '../sync/merge.js';

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

    const { rows } = await pool.query<{ state: Record<string, unknown> }>(
      'select state from profiles where user_id = $1',
      [userId],
    );
    const remote = rows[0]?.state ?? {};
    const incoming = parsed.data.state;

    // Non-history fields are simple last-write-wins: the merge rule exists
    // for prayer history specifically, because that is the data a stale
    // device could otherwise erase. Everything else in `state` is whatever
    // the calling device just saved, so it overwrites remote as a normal
    // write would.
    const merged: Record<string, unknown> = {
      ...remote,
      ...incoming,
      history: mergeHistory(historyOf(incoming), historyOf(remote)),
    };

    await pool.query(
      `insert into profiles (user_id, state, updated_at) values ($1, $2, now())
       on conflict (user_id) do update set state = excluded.state, updated_at = now()`,
      [userId, merged],
    );
    return { state: merged };
  });
}
