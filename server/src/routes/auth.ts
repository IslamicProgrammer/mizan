import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { verifyGoogleIdToken } from '../auth/google.js';
import { issueToken } from '../auth/token.js';
import { pool } from '../db.js';

const Body = z.object({ idToken: z.string().min(1) });

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/google', async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'idToken required' });

    const g = await verifyGoogleIdToken(parsed.data.idToken);
    if (!g) return reply.code(401).send({ error: 'invalid token' });

    const { rows } = await pool.query<{ id: string }>(
      `insert into users (google_sub, email) values ($1, $2)
       on conflict (google_sub) do update set email = excluded.email
       returning id`,
      [g.sub, g.email ?? null],
    );
    const row = rows[0];
    // `insert ... returning` always yields a row for a successful insert or
    // conflict-update, so this is a defensive guard, not an expected path.
    if (!row) return reply.code(500).send({ error: 'user upsert failed' });
    const userId = row.id;
    await pool.query(
      'insert into profiles (user_id) values ($1) on conflict (user_id) do nothing',
      [userId],
    );
    return { token: await issueToken(userId), userId };
  });
}
