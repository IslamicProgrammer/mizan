import type { FastifyInstance } from 'fastify';

import { fetchAyah, tashkentDateKey, type DailyAyah } from '../quran/ayah.js';
import { CURATED_AYAHS, pickAyah } from '../quran/ayahs.js';

/**
 * GET /ayah/today — the home screen's daily ayah card.
 *
 * The app does not call `api.alquran.cloud` directly. Proxying it here means
 * one upstream call a day instead of one per install opening the home
 * screen; a single place to fix things if alquran.cloud ever changes its
 * response shape or goes down, rather than an app-store update; and no third
 * party ever sees a user's IP address for a feature that has nothing to do
 * with them.
 *
 * No authentication, and deliberately none of `/scan`'s SCAN_PUBLIC-style
 * fail-closed guard: that guard exists because every `/scan` call spends
 * money on a paid Gemini request and an unauthenticated flood would be a
 * real bill. This route costs nothing per call beyond the one shared
 * upstream fetch a day the cache below already limits it to, so there is no
 * budget to protect and no reason to make it opt-in.
 */
export async function ayahRoutes(app: FastifyInstance) {
  // Scoped to this plugin registration, not module-level — the same
  // reasoning as `/scan`'s rate-limit map: a long-running server gets one
  // real cache that lives for the process, while a test that registers this
  // route fresh doesn't inherit an entry a previous test (or a previous day)
  // left behind.
  const cache = new Map<string, DailyAyah>();

  app.get('/ayah/today', async (_req, reply) => {
    // The app's own `npm run smoke` renders every route through
    // react-native-web in a real browser, and the home screen calls this
    // route the moment it mounts -- unlike every other route here, which
    // only ever fires from a user action. A browser enforces CORS on that
    // mount-time call; a native build never does. Public, free, read-only
    // data with no cookie or auth header involved is exactly the case this
    // is safe for, so it is set on this one route rather than globally.
    reply.header('access-control-allow-origin', '*');

    const key = tashkentDateKey();
    const cached = cache.get(key);
    if (cached) return cached;

    try {
      const ayah = await fetchAyah(pickAyah(key, CURATED_AYAHS));
      // `tashkentDateKey()` only ever produces *today's* key here, so any
      // other entry left in the map is a previous day this route will never
      // be asked for again — dropping it keeps a long-running process from
      // accumulating one dead entry per day forever.
      cache.clear();
      cache.set(key, ayah);
      return ayah;
    } catch {
      // alquran.cloud unreachable, slow past the timeout, or returned
      // something we don't recognise. The app's own rule is that no ayah is
      // a normal day and an error card where scripture should be is worse —
      // a 404 lets it apply that rule unchanged, rather than a 500 it would
      // have to specially distinguish from "nothing today".
      return reply.code(404).send();
    }
  });
}
