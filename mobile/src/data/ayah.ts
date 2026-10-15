/**
 * The daily ayah card on the home screen (task 31).
 *
 * The app never calls `api.alquran.cloud` itself -- the server's `GET
 * /ayah/today` already picks the day's ayah from its own curated list,
 * fetches it, and caches it for the rest of the day, so this module only
 * has to talk to our own API and knows nothing about surah numbers or the
 * curated list at all. See `server/src/routes/ayah.ts` for why that line is
 * drawn there.
 *
 * This app is offline-first and the home screen is the first thing it
 * draws, so this is the one rule that matters here: never block, never
 * spin, never show an error where scripture should be. `loadDailyAyah`
 * reads whatever is cached first (instant, synchronous-feeling), then tries
 * the network, and only ever replaces the cache with a result it actually
 * trusts -- a failed fetch keeps yesterday's ayah on screen rather than
 * clearing it, and a first launch with no network and nothing cached
 * resolves to `null`, which `home.tsx` renders as nothing at all.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getEnv } from './env';
import { ymd } from './store';

export type DailyAyah = {
  /** The `ymd()` day this ayah was fetched for -- not necessarily today,
   * once a stale cache entry has been kept across a fetch failure. */
  date: string;
  reference: string;
  surah: number;
  ayah: number;
  arabic: string;
  uzbek: string;
};

const CACHE_KEY = 'mizan.ayah.v1';

function isDailyAyah(value: unknown): value is Omit<DailyAyah, 'date'> {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.reference === 'string' &&
    typeof r.surah === 'number' &&
    typeof r.ayah === 'number' &&
    typeof r.arabic === 'string' &&
    typeof r.uzbek === 'string'
  );
}

async function readCache(): Promise<DailyAyah | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.date !== 'string' || !isDailyAyah(parsed)) return null;
    return parsed as DailyAyah;
  } catch {
    // A corrupt cache entry is treated exactly like no cache at all, never
    // a crash on the one screen that must never fail to render.
    return null;
  }
}

async function writeCache(ayah: DailyAyah): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(ayah));
  } catch {
    // Losing the cache write just means the next launch fetches again --
    // never worse than today's render, which already has the value.
  }
}

/** Null on anything that isn't a clean 200 with the expected shape --
 * network down, the server's own 404 for an upstream failure, or a body
 * that doesn't look like `DailyAyah`. The caller falls back to the cache
 * either way, so this never needs to distinguish *why* it failed. */
async function fetchToday(today: string): Promise<DailyAyah | null> {
  try {
    const r = await fetch(`${getEnv().apiUrl}/ayah/today`);
    if (!r.ok) return null;
    const body = await r.json();
    if (!isDailyAyah(body)) return null;
    return { ...body, date: today };
  } catch {
    return null;
  }
}

/**
 * The one entry point `home.tsx` calls. Reads the cache, and only reaches
 * for the network when the cache isn't already today's -- a day that
 * already has its ayah has no reason to spend a request re-confirming it.
 */
export async function loadDailyAyah(now = new Date()): Promise<DailyAyah | null> {
  const cached = await readCache();
  const today = ymd(now);
  if (cached?.date === today) return cached;

  const fresh = await fetchToday(today);
  if (fresh) {
    await writeCache(fresh);
    return fresh;
  }

  // Offline, or the server has nothing today: keep whatever was cached --
  // yesterday's ayah, or `null` on a first launch that has never had one --
  // rather than clearing it. A day-old ayah is better than none; none is
  // better than an error card where scripture should be.
  return cached;
}
