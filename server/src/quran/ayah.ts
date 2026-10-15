import type { AyahRef } from './ayahs.js';

export type DailyAyah = { reference: string; surah: number; ayah: number; arabic: string; uzbek: string };

const ALQURAN_BASE = 'https://api.alquran.cloud/v1/ayah';

/** Generous for a tiny JSON response, short enough that a slow or hung
 * upstream never leaves a request -- or the route's cache fill -- stuck for
 * the lifetime of the connection. */
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Uzbekistan runs on a single fixed offset with no DST, the same pin
 * `prayer.ts` uses for the whole app. Picking the day boundary in Tashkent
 * time rather than whatever timezone the server process happens to run in
 * (typically UTC) matters here specifically: UTC lags five hours behind
 * Tashkent, so between midnight and 5am Tashkent time a UTC clock still
 * thinks it is yesterday. Using UTC would hand out yesterday's ayah to the
 * first people to open the app each morning, breaking the "same ayah for
 * everyone, derived from the date" promise for exactly the users who open
 * the app earliest.
 */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export function tashkentDateKey(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + TASHKENT_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

type AlquranResponse = { data?: Array<{ text?: string }> };

/**
 * One call to `api.alquran.cloud` for one ayah, in both editions at once --
 * verified working against the real endpoint before this was written. Throws
 * on any transport failure, a non-OK response, or a body that doesn't look
 * like what we expect; the caller (the `/ayah/today` route) decides what
 * that means for the app, same division of labour as `scan/gemini.ts`'s
 * `detectObject` and the `/scan` route.
 */
export async function fetchAyah(ref: AyahRef): Promise<DailyAyah> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${ALQURAN_BASE}/${ref.surah}:${ref.ayah}/editions/quran-uthmani,uz.sodik`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`alquran.cloud responded ${res.status}`);

    const body = (await res.json()) as AlquranResponse;
    const arabic = body.data?.[0]?.text;
    const uzbek = body.data?.[1]?.text;
    if (typeof arabic !== 'string' || typeof uzbek !== 'string' || !arabic || !uzbek) {
      throw new Error('alquran.cloud returned an unexpected shape');
    }

    return { reference: `${ref.surahName} ${ref.surah}:${ref.ayah}`, surah: ref.surah, ayah: ref.ayah, arabic, uzbek };
  } finally {
    clearTimeout(timeout);
  }
}
