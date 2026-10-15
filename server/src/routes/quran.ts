import type { FastifyInstance } from 'fastify';

import { fetchAyahAudio, type AyahAudio } from '../quran/audio.js';
import { fetchReciters, type Reciter } from '../quran/reciters.js';
import { SURAHS } from '../quran/surahs.js';
import { fetchSurahText, type AyahText } from '../quran/verses.js';

/**
 * The Quran reader's four routes (task 33).
 *
 * **Metadata goes through this server** -- the surah list, ayah text, the
 * Uzbek translation, the reciter list -- same standing rule as `/ayah/today`:
 * one upstream call serves every user, there is one place to fix a shape
 * change, and no third party sees a user's IP for a feature that has
 * nothing to do with them.
 *
 * **Audio is the deliberate exception.** `/quran/:surah/audio/:reciter`
 * returns a small JSON list of CDN *URLs*, never the audio itself -- the
 * phone fetches every MP3 straight from `verses.quran.com`. A surah is
 * hundreds of megabyte-scale files; proxying that through one small Contabo
 * box would be slow for the user and would turn this server into a CDN
 * nobody is paying for it to be. See `quran/audio.ts` for the same note at
 * the call site that actually makes the choice.
 *
 * No authentication and no `SCAN_PUBLIC`-style guard, for the same reason
 * `/ayah/today` has none: nothing here spends money per call the way `/scan`
 * does, so there is no budget to protect.
 */
export async function quranRoutes(app: FastifyInstance) {
  // Three independent caches, not one keyed map -- a surah's text, a
  // reciter's audio list, and the reciter roster change on entirely
  // different (effectively never) schedules, and keeping them apart means a
  // bug in one cache's key shape can't collide with another's. All three are
  // scoped to this plugin registration, the same reasoning as `/ayah/today`'s
  // cache: a long-running server gets one real cache for the process, a test
  // that registers this route fresh starts clean.
  const textCache = new Map<number, AyahText[]>();
  const audioCache = new Map<string, AyahAudio[]>();
  let recitersCache: Reciter[] | null = null;

  // Every route below is fetched the instant some screen mounts -- the
  // surah list and the reader both load on open, not on a tap -- the same
  // situation `/ayah/today`'s own CORS header exists for: `npm run smoke`
  // mounts every screen through react-native-web in a real browser, which
  // enforces CORS on that mount-time call; a native build never does. This
  // is a plugin-scoped hook rather than four repeats of the same header
  // because Fastify's encapsulation keeps it from leaking onto any route
  // outside this file.
  app.addHook('onRequest', async (_req, reply) => {
    reply.header('access-control-allow-origin', '*');
  });

  // Bundled, not fetched -- see `quran/surahs.ts`. No cache needed because
  // there is no network call to save.
  app.get('/quran/surahs', async () => SURAHS);

  app.get('/quran/reciters', async (_req, reply) => {
    if (recitersCache) return recitersCache;
    try {
      const reciters = await fetchReciters();
      recitersCache = reciters;
      return reciters;
    } catch {
      return reply.code(404).send();
    }
  });

  app.get<{ Params: { surah: string } }>('/quran/:surah/text', async (req, reply) => {
    const surah = Number(req.params.surah);
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) {
      return reply.code(400).send({ error: 'surah must be 1-114' });
    }

    const cached = textCache.get(surah);
    if (cached) return { surah, ayahs: cached };

    try {
      const ayahs = await fetchSurahText(surah);
      textCache.set(surah, ayahs);
      return { surah, ayahs };
    } catch {
      // Upstream unreachable, a shape we don't recognise, or (should it ever
      // happen) a count mismatch `fetchSurahText` itself refuses to trust --
      // all three collapse to the same 404 a client already knows to treat
      // as "try again later", the same contract `/ayah/today` makes.
      return reply.code(404).send();
    }
  });

  app.get<{ Params: { surah: string; reciter: string } }>(
    '/quran/:surah/audio/:reciter',
    async (req, reply) => {
      const surah = Number(req.params.surah);
      const reciter = Number(req.params.reciter);
      if (!Number.isInteger(surah) || surah < 1 || surah > 114) {
        return reply.code(400).send({ error: 'surah must be 1-114' });
      }
      if (!Number.isInteger(reciter) || reciter < 1) {
        return reply.code(400).send({ error: 'reciter must be a positive integer' });
      }

      const key = `${reciter}:${surah}`;
      const cached = audioCache.get(key);
      if (cached) return { surah, reciter, ayahs: cached };

      try {
        const ayahs = await fetchAyahAudio(reciter, surah);
        audioCache.set(key, ayahs);
        return { surah, reciter, ayahs };
      } catch {
        return reply.code(404).send();
      }
    },
  );
}
