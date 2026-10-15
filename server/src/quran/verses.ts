import { surahByNumber } from './surahs.js';

/**
 * A surah's readable text: Uthmani Arabic from `api.quran.com`, Uzbek
 * translation from `api.alquran.cloud`'s `uz.sodik` edition -- the same
 * source and translator the daily-ayah card already credits. Two upstreams
 * for one surah because neither publishes both: `quran.com` has the Uthmani
 * script this app standardised on for `font.arabic`, but no Uzbek; Sodiq's
 * Uzbek edition exists only on `alquran.cloud`, whose own "Uthmani" edition
 * prepends the Bismillah to a surah's first ayah -- a correct but different
 * convention this app does not want to reconcile against `quran.com`'s. So
 * `quran.com` supplies every ayah's Arabic and `alquran.cloud` supplies only
 * the Uzbek column, matched up by ayah number below.
 */
export type AyahText = { number: number; arabic: string; uzbek: string };

/** The longest surah (Baqara) has 286 ayahs; asking for that many per page
 * on both upstreams in one call is simpler and no slower than paginating,
 * and every shorter surah just gets back fewer than it asked for. */
const PER_PAGE = 300;

const FETCH_TIMEOUT_MS = 8_000;

type QuranComResponse = {
  verses?: Array<{ verse_number?: unknown; text_uthmani?: unknown }>;
};

type AlquranResponse = {
  data?: Array<{ ayahs?: Array<{ numberInSurah?: unknown; text?: unknown }> }>;
};

async function getJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Throws on a transport failure, an unrecognised shape from either
 * upstream, or a surah number this app does not recognise -- the caller
 * (the `/quran/:surah/text` route) turns all three into the same 404, same
 * as `fetchAyah` does for the daily card.
 */
export async function fetchSurahText(surah: number): Promise<AyahText[]> {
  const meta = surahByNumber(surah);
  if (!meta) throw new Error(`no such surah: ${surah}`);

  const [arabicBody, uzbekBody] = await Promise.all([
    getJson<QuranComResponse>(
      `https://api.quran.com/api/v4/verses/by_chapter/${surah}?fields=text_uthmani&per_page=${PER_PAGE}`,
    ),
    getJson<AlquranResponse>(`https://api.alquran.cloud/v1/surah/${surah}/editions/uz.sodik`),
  ]);

  if (!Array.isArray(arabicBody.verses)) throw new Error('quran.com returned an unexpected shape');
  const uzbekAyahs = uzbekBody.data?.[0]?.ayahs;
  if (!Array.isArray(uzbekAyahs)) throw new Error('alquran.cloud returned an unexpected shape');

  const uzbekByNumber = new Map<number, string>();
  for (const a of uzbekAyahs) {
    if (typeof a.numberInSurah === 'number' && typeof a.text === 'string') {
      uzbekByNumber.set(a.numberInSurah, a.text);
    }
  }

  const out: AyahText[] = [];
  for (const v of arabicBody.verses) {
    if (typeof v.verse_number !== 'number' || typeof v.text_uthmani !== 'string') continue;
    const uzbek = uzbekByNumber.get(v.verse_number);
    if (!uzbek) continue; // an ayah either upstream is missing is dropped, not guessed at
    out.push({ number: v.verse_number, arabic: v.text_uthmani.trim(), uzbek });
  }

  if (out.length !== meta.ayahCount) {
    throw new Error(`expected ${meta.ayahCount} ayahs for surah ${surah}, got ${out.length}`);
  }
  return out;
}
