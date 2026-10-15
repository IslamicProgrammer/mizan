import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { fetchSurahText } = vi.hoisted(() => ({ fetchSurahText: vi.fn() }));
vi.mock('../quran/verses.js', () => ({ fetchSurahText }));

const { fetchAyahAudio } = vi.hoisted(() => ({ fetchAyahAudio: vi.fn() }));
vi.mock('../quran/audio.js', () => ({ fetchAyahAudio }));

const { fetchReciters } = vi.hoisted(() => ({ fetchReciters: vi.fn() }));
vi.mock('../quran/reciters.js', () => ({ fetchReciters }));

import { quranRoutes } from '../routes/quran.js';

async function buildApp() {
  const app = Fastify();
  await app.register(quranRoutes);
  return app;
}

const IKHLAS_TEXT = [
  { number: 1, arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', uzbek: 'Айт: «У Аллоҳ ягонадир».' },
  { number: 2, arabic: 'اللَّهُ الصَّمَدُ', uzbek: 'Аллоҳ сомаддир.' },
];
const IKHLAS_AUDIO = [
  { ayah: 1, url: 'https://verses.quran.com/Alafasy/mp3/112001.mp3' },
  { ayah: 2, url: 'https://verses.quran.com/Alafasy/mp3/112002.mp3' },
];
const RECITERS = [{ id: 7, name: 'Mishari Rashid al-`Afasy', style: null }];

afterEach(() => {
  fetchSurahText.mockReset();
  fetchAyahAudio.mockReset();
  fetchReciters.mockReset();
});

describe('GET /quran/surahs', () => {
  it('serves the bundled list with no upstream call at all', async () => {
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/quran/surahs' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(114);
    expect(fetchSurahText).not.toHaveBeenCalled();
    expect(fetchAyahAudio).not.toHaveBeenCalled();
    expect(fetchReciters).not.toHaveBeenCalled();
  });
});

describe('GET /quran/reciters', () => {
  it('returns the reciter list and caches it across requests', async () => {
    fetchReciters.mockResolvedValueOnce(RECITERS);
    const app = await buildApp();

    const first = await app.inject({ method: 'GET', url: '/quran/reciters' });
    const second = await app.inject({ method: 'GET', url: '/quran/reciters' });

    expect(first.json()).toEqual(RECITERS);
    expect(second.json()).toEqual(RECITERS);
    expect(fetchReciters).toHaveBeenCalledTimes(1);
  });

  it('returns 404, never 500, when the upstream is unreachable', async () => {
    fetchReciters.mockRejectedValueOnce(new Error('fetch failed'));
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/quran/reciters' });

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /quran/:surah/text', () => {
  it('fetches once and serves every later request for the same surah from cache', async () => {
    fetchSurahText.mockResolvedValueOnce(IKHLAS_TEXT);
    const app = await buildApp();

    const first = await app.inject({ method: 'GET', url: '/quran/112/text' });
    const second = await app.inject({ method: 'GET', url: '/quran/112/text' });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ surah: 112, ayahs: IKHLAS_TEXT });
    expect(second.json()).toEqual({ surah: 112, ayahs: IKHLAS_TEXT });
    expect(fetchSurahText).toHaveBeenCalledTimes(1);
  });

  it('keeps one surah\'s cache entry independent of another\'s', async () => {
    fetchSurahText.mockResolvedValueOnce(IKHLAS_TEXT);
    fetchSurahText.mockResolvedValueOnce([{ number: 1, arabic: 'الْحَمْدُ', uzbek: 'Ҳамд' }]);
    const app = await buildApp();

    const ikhlas = await app.inject({ method: 'GET', url: '/quran/112/text' });
    const fatiha = await app.inject({ method: 'GET', url: '/quran/1/text' });
    const ikhlasAgain = await app.inject({ method: 'GET', url: '/quran/112/text' });

    expect(ikhlas.json().ayahs).toEqual(IKHLAS_TEXT);
    expect(fatiha.json().surah).toBe(1);
    expect(ikhlasAgain.json().ayahs).toEqual(IKHLAS_TEXT);
    expect(fetchSurahText).toHaveBeenCalledTimes(2);
  });

  it('retries the upstream on the next request after a failure -- a bad fetch is never cached', async () => {
    fetchSurahText.mockRejectedValueOnce(new Error('fetch failed'));
    fetchSurahText.mockResolvedValueOnce(IKHLAS_TEXT);
    const app = await buildApp();

    const first = await app.inject({ method: 'GET', url: '/quran/112/text' });
    const second = await app.inject({ method: 'GET', url: '/quran/112/text' });

    expect(first.statusCode).toBe(404);
    expect(second.statusCode).toBe(200);
    expect(fetchSurahText).toHaveBeenCalledTimes(2);
  });

  it('rejects a surah number outside 1-114 before ever calling upstream', async () => {
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/quran/115/text' });

    expect(res.statusCode).toBe(400);
    expect(fetchSurahText).not.toHaveBeenCalled();
  });
});

describe('GET /quran/:surah/audio/:reciter', () => {
  it('fetches once per reciter-and-surah pair and caches it', async () => {
    fetchAyahAudio.mockResolvedValueOnce(IKHLAS_AUDIO);
    const app = await buildApp();

    const first = await app.inject({ method: 'GET', url: '/quran/112/audio/7' });
    const second = await app.inject({ method: 'GET', url: '/quran/112/audio/7' });

    expect(first.json()).toEqual({ surah: 112, reciter: 7, ayahs: IKHLAS_AUDIO });
    expect(second.json()).toEqual({ surah: 112, reciter: 7, ayahs: IKHLAS_AUDIO });
    expect(fetchAyahAudio).toHaveBeenCalledTimes(1);
  });

  it('treats the same surah from a different reciter as a separate cache entry', async () => {
    const otherReciter = IKHLAS_AUDIO.map((a) => ({ ...a, url: a.url.replace('Alafasy', 'Sudais') }));
    fetchAyahAudio.mockResolvedValueOnce(IKHLAS_AUDIO);
    fetchAyahAudio.mockResolvedValueOnce(otherReciter);
    const app = await buildApp();

    const alafasy = await app.inject({ method: 'GET', url: '/quran/112/audio/7' });
    const sudais = await app.inject({ method: 'GET', url: '/quran/112/audio/3' });

    expect(alafasy.json().ayahs).toEqual(IKHLAS_AUDIO);
    expect(sudais.json().ayahs).toEqual(otherReciter);
    expect(fetchAyahAudio).toHaveBeenCalledTimes(2);
  });

  it('rejects a non-numeric reciter before ever calling upstream', async () => {
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/quran/112/audio/not-a-number' });

    expect(res.statusCode).toBe(400);
    expect(fetchAyahAudio).not.toHaveBeenCalled();
  });

  it('returns 404, never 500, when the upstream has nothing for this pair', async () => {
    fetchAyahAudio.mockRejectedValueOnce(new Error('fetch failed'));
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/quran/112/audio/7' });

    expect(res.statusCode).toBe(404);
  });
});
