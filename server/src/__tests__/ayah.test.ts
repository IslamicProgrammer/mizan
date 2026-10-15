import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { fetchAyah } = vi.hoisted(() => ({ fetchAyah: vi.fn() }));
vi.mock('../quran/ayah.js', async () => {
  const actual = await vi.importActual<typeof import('../quran/ayah.js')>('../quran/ayah.js');
  return { ...actual, fetchAyah };
});

import { ayahRoutes } from '../routes/ayah.js';

async function buildApp() {
  const app = Fastify();
  await app.register(ayahRoutes);
  return app;
}

const SAMPLE = { reference: 'Ixlos 112:1', surah: 112, ayah: 1, arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', uzbek: 'Айт: «У Аллоҳ ягонадир».' };

afterEach(() => {
  fetchAyah.mockReset();
});

describe('GET /ayah/today', () => {
  it('returns the flat shape the app renders directly', async () => {
    fetchAyah.mockResolvedValueOnce(SAMPLE);
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/ayah/today' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(SAMPLE);
  });

  it('serves a second request from the day cache without a second upstream fetch', async () => {
    fetchAyah.mockResolvedValueOnce(SAMPLE);
    const app = await buildApp();

    const first = await app.inject({ method: 'GET', url: '/ayah/today' });
    const second = await app.inject({ method: 'GET', url: '/ayah/today' });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(SAMPLE);
    expect(fetchAyah).toHaveBeenCalledTimes(1);
  });

  it('returns 404, never 500, when the upstream is unreachable', async () => {
    fetchAyah.mockRejectedValueOnce(new Error('fetch failed'));
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/ayah/today' });

    expect(res.statusCode).toBe(404);
  });

  it('retries the upstream on the next request after a failure — a bad fetch is never cached', async () => {
    fetchAyah.mockRejectedValueOnce(new Error('fetch failed'));
    fetchAyah.mockResolvedValueOnce(SAMPLE);
    const app = await buildApp();

    const first = await app.inject({ method: 'GET', url: '/ayah/today' });
    const second = await app.inject({ method: 'GET', url: '/ayah/today' });

    expect(first.statusCode).toBe(404);
    expect(second.statusCode).toBe(200);
    expect(fetchAyah).toHaveBeenCalledTimes(2);
  });

  it('needs no authorization header', async () => {
    fetchAyah.mockResolvedValueOnce(SAMPLE);
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/ayah/today' });

    expect(res.statusCode).toBe(200);
  });
});
