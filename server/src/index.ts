import Fastify from 'fastify';

import { migrate, pool } from './db.js';
import { ENV } from './env.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profile.js';

const app = Fastify({ logger: true });

app.get('/health', async () => {
  await pool.query('select 1');
  return { ok: true };
});

await app.register(authRoutes);
await app.register(profileRoutes);

await migrate();
await app.listen({ port: ENV.port, host: '0.0.0.0' });
