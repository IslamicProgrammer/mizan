/**
 * The Quran reader's data (task 33): the surah list, a surah's Arabic and
 * Uzbek text, and the reciter roster -- all metadata, so all three come from
 * our own server, never `quran.com` or `alquran.cloud` directly. See
 * `server/src/routes/quran.ts` for why that line is drawn there, and why
 * audio is the one thing on the other side of it (`recitation.ts` fetches
 * MP3s straight from the CDN).
 *
 * Every read here is cache-first, the same shape `ayah.ts` already
 * established: a screen that mounts offline must show whatever was cached
 * last, not a spinner and not an error. `loadSurahs` and `loadReciters`
 * cache forever once they succeed once -- neither list has a "today" to go
 * stale against, so there is nothing to invalidate. `loadSurahText` caches
 * per surah, which is Step 6's offline promise: a surah already read stays
 * readable with no network at all.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getEnv } from './env';

export type Surah = {
  number: number;
  nameUzbek: string;
  nameArabic: string;
  ayahCount: number;
  revelation: 'meccan' | 'medinan';
};

export type AyahText = { number: number; arabic: string; uzbek: string };

export type Reciter = { id: number; name: string; style: string | null };

const SURAHS_KEY = 'mizan.quran.surahs.v1';
const RECITERS_KEY = 'mizan.quran.reciters.v1';
const textKey = (surah: number) => `mizan.quran.text.v1.${surah}`;

function isSurah(v: unknown): v is Surah {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.number === 'number' &&
    typeof r.nameUzbek === 'string' &&
    typeof r.nameArabic === 'string' &&
    typeof r.ayahCount === 'number' &&
    (r.revelation === 'meccan' || r.revelation === 'medinan')
  );
}

function isAyahText(v: unknown): v is AyahText {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.number === 'number' && typeof r.arabic === 'string' && typeof r.uzbek === 'string';
}

function isReciter(v: unknown): v is Reciter {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === 'number' && typeof r.name === 'string' && (r.style === null || typeof r.style === 'string');
}

async function readCache<T>(key: string, guard: (v: unknown) => v is T): Promise<T[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(guard)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Losing the write just costs the next load a network round trip --
    // never a reason to fail the load that already has the value in hand.
  }
}

/** All 114, Uzbek-named -- cached forever once fetched once. Returns `[]`
 * only on a first launch that is also offline, which `index.tsx` shows as an
 * honest empty state rather than a crash. */
export async function loadSurahs(): Promise<Surah[]> {
  const cached = await readCache(SURAHS_KEY, isSurah);
  if (cached) return cached;

  try {
    const r = await fetch(`${getEnv().apiUrl}/quran/surahs`);
    if (!r.ok) return [];
    const body = await r.json();
    if (!Array.isArray(body) || !body.every(isSurah)) return [];
    await writeCache(SURAHS_KEY, body);
    return body;
  } catch {
    return [];
  }
}

/** The twelve reciters, same cache-forever shape as `loadSurahs`. */
export async function loadReciters(): Promise<Reciter[]> {
  const cached = await readCache(RECITERS_KEY, isReciter);
  if (cached) return cached;

  try {
    const r = await fetch(`${getEnv().apiUrl}/quran/reciters`);
    if (!r.ok) return [];
    const body = await r.json();
    if (!Array.isArray(body) || !body.every(isReciter)) return [];
    await writeCache(RECITERS_KEY, body);
    return body;
  } catch {
    return [];
  }
}

/**
 * A surah's ayahs, Arabic and Uzbek together. `null` means "not available
 * right now" -- no cache and the network failed -- which the reader shows as
 * "offline, not read yet" rather than an error, per Step 6. Once a surah has
 * been read successfully one time, it is cached forever: re-reading Baqara
 * next week costs no request at all.
 */
export async function loadSurahText(surah: number): Promise<AyahText[] | null> {
  const cached = await readCache(textKey(surah), isAyahText);
  if (cached) return cached;

  try {
    const r = await fetch(`${getEnv().apiUrl}/quran/${surah}/text`);
    if (!r.ok) return null;
    const body = await r.json();
    const ayahs = body?.ayahs;
    if (!Array.isArray(ayahs) || !ayahs.every(isAyahText)) return null;
    await writeCache(textKey(surah), ayahs);
    return ayahs;
  } catch {
    return null;
  }
}

/**
 * Clamps a requested ayah number into `[1, ayahCount]`. Every entry point
 * into the reader (a deep link from the daily-ayah card, a saved reading
 * position from a surah whose ayah count this install's data has since
 * corrected) hands this a number it cannot fully trust, and the FlatList
 * this feeds has no graceful way to scroll to an index that does not exist.
 */
export function clampAyah(ayahCount: number, ayah: number): number {
  if (!Number.isFinite(ayah)) return 1;
  return Math.min(Math.max(1, Math.floor(ayah)), Math.max(1, ayahCount));
}

/**
 * The surah list's "Davom etish" banner and the reader's own header both
 * need this exact sentence, so it is built once here rather than twice.
 * `null` when there is nothing to resume -- a fresh install, or a position
 * naming a surah this install's bundled list doesn't recognise -- and the
 * caller renders nothing rather than a broken sentence.
 */
export function readingLabel(surahs: Surah[], reading: { surah: number; ayah: number } | null): string | null {
  if (!reading) return null;
  const surah = surahs.find((s) => s.number === reading.surah);
  if (!surah) return null;
  const ayah = clampAyah(surah.ayahCount, reading.ayah);
  return `${surah.nameUzbek}, ${ayah}-oyat`;
}
