import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { detectObject } = vi.hoisted(() => ({ detectObject: vi.fn() }));
vi.mock('../scan/gemini.js', () => ({ detectObject }));

// Mocked wholesale (ESM module namespaces can't be spied on in place) so the
// "never persists the image" test can assert these are never called, rather
// than trusting that the route happens not to import `fs` at all.
const fsWrites = vi.hoisted(() => ({
  writeFile: vi.fn(),
  writeFileSync: vi.fn(),
  appendFile: vi.fn(),
  appendFileSync: vi.fn(),
}));
vi.mock('node:fs', () => fsWrites);

import { scanRoutes } from '../routes/scan.js';

async function buildApp() {
  const app = Fastify();
  await app.register(scanRoutes);
  return app;
}

/** A real destination stream, not a spy on `log.info` — a spy captures the
 * live `req` object by reference, which still gets the parsed body attached
 * to it moments later by the body parser, and would flag that mutation as
 * "logged" even though pino's request serializer never actually reads
 * `body`. Writing to a stream captures only what pino truly serializes and
 * emits, which is what the promise on screen is actually about. */
function buildAppWithCapturedLogs() {
  const lines: string[] = [];
  const stream = { write: (chunk: string) => lines.push(chunk) };
  const app = Fastify({ logger: { level: 'info', stream } });
  return { app, lines };
}

const SMALL_IMAGE = 'aGVsbG8=';

afterEach(() => {
  detectObject.mockReset();
});

describe('POST /scan', () => {
  it('rejects a body too large to be a camera frame', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/scan',
      payload: { image: 'x'.repeat(3_000_000), target: 'mat' },
    });

    expect(res.statusCode).toBe(413);
  });

  it('rejects an unknown target', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/scan',
      payload: { image: 'abc', target: 'bicycle' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns match:false rather than throwing when Gemini is unreachable', async () => {
    detectObject.mockRejectedValueOnce(new Error('fetch failed'));
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/scan',
      payload: { image: SMALL_IMAGE, target: 'mat' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ match: false });
  });

  it('returns match:true when Gemini says yes', async () => {
    detectObject.mockResolvedValueOnce(true);
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/scan',
      payload: { image: SMALL_IMAGE, target: 'sink' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ match: true });
  });

  it('never logs or persists the image', async () => {
    detectObject.mockResolvedValueOnce(true);
    const { app, lines } = buildAppWithCapturedLogs();
    await app.register(scanRoutes);

    await app.inject({
      method: 'POST',
      url: '/scan',
      payload: { image: SMALL_IMAGE, target: 'mat' },
    });

    for (const fn of Object.values(fsWrites)) expect(fn).not.toHaveBeenCalled();

    // The access log (method/url/status) is expected — the payload itself
    // must never appear in any line it writes.
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).not.toContain(SMALL_IMAGE);
  });

  it('rate-limits a second scan from the same IP inside the 10-second window', async () => {
    detectObject.mockResolvedValue(false);
    const app = await buildApp();
    const payload = { image: SMALL_IMAGE, target: 'mat' as const };

    const first = await app.inject({ method: 'POST', url: '/scan', payload });
    const second = await app.inject({ method: 'POST', url: '/scan', payload });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
  });
});
