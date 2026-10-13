import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ENV } from '../env.js';
import { detectObject } from '../scan/gemini.js';

const Body = z.object({
  image: z.string().min(1),
  target: z.enum(['mat', 'sink', 'both']),
});

/** A half-quality `takePictureAsync` JPEG comfortably fits well under this;
 * anything near it is not a camera frame. */
const SCAN_BODY_LIMIT = 2 * 1024 * 1024;

/** One scan per IP per window — a retry loop at 5am is the worst version of
 * this feature, and it costs money per call. */
const RATE_LIMIT_MS = 10_000;

/**
 * POST /scan — the only thing that can silence the Fajr alarm besides the
 * ten-second hold-to-escape in the app.
 *
 * Authentication is deliberately absent: Task 8 (login) has not landed, so no
 * client can hold a JWT yet. The moment it ships, this route must require a
 * valid token — until then it is an open endpoint reachable by anyone who
 * finds the URL, and every call here costs a Gemini request.
 *
 * The image is never written to disk and never logged — not as a redaction,
 * but because nothing in this handler touches `fs` or passes the body to the
 * logger. That is the promise the app makes on screen, kept by omission
 * rather than by a filter that could be bypassed or forgotten.
 */
export async function scanRoutes(app: FastifyInstance) {
  // Scoped to this plugin registration, not module-level: a long-running
  // server gets one real limiter, while tests that register the route fresh
  // each time don't bleed rate-limit state across unrelated assertions.
  const lastCallAt = new Map<string, number>();

  app.post('/scan', { bodyLimit: SCAN_BODY_LIMIT }, async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'image and a valid target (mat, sink, both) are required' });
    }

    const now = Date.now();
    const last = lastCallAt.get(req.ip);
    if (last !== undefined && now - last < RATE_LIMIT_MS) {
      return reply.code(429).send({ error: 'one scan per 10 seconds' });
    }
    lastCallAt.set(req.ip, now);

    try {
      const match = await detectObject(parsed.data.image, parsed.data.target, ENV.geminiApiKey);
      return { match };
    } catch {
      // Gemini unreachable, rate-limited upstream, or a malformed response —
      // the caller may be standing in the dark with no signal. A 500 here is
      // a dead end; a false "no match" at least leaves the shutter live so
      // they can try again, which this endpoint must never take away.
      return { match: false };
    }
  });
}
