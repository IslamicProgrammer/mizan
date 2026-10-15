/**
 * Per-ayah audio URLs for a reciter's recitation of a surah.
 *
 * This is the one deliberate exception to "third-party APIs are called from
 * our server" (see `routes/quran.ts`'s top comment for the full reasoning):
 * this function only ever touches `api.quran.com`'s small JSON list of
 * *URLs*, never the audio bytes themselves. The phone fetches every MP3
 * directly from `verses.quran.com`. Proxying megabyte-scale files through
 * this one small box, for a surah that can run to hundreds of them, would be
 * slower for the user and would turn this server into a CDN nobody is
 * paying for it to be.
 */
export type AyahAudio = { ayah: number; url: string };

/** `api.quran.com`'s `by_chapter` endpoint returns paths relative to this
 * host, not full URLs -- verified live before this shipped, including that
 * the CDN serves `audio/mpeg` with `access-control-allow-origin: *`, so the
 * phone can fetch it directly with no extra header this server would
 * otherwise have had to arrange. */
const AUDIO_CDN_BASE = 'https://verses.quran.com/';

/** Same ceiling as `verses.ts` -- Baqara's 286 ayahs in one page rather than
 * paginating. */
const PER_PAGE = 300;

const FETCH_TIMEOUT_MS = 8_000;

type ByChapterResponse = {
  audio_files?: Array<{ verse_key?: unknown; url?: unknown }>;
};

/**
 * Throws on a transport failure or an unrecognised shape -- the caller (the
 * `/quran/:surah/audio/:reciter` route) turns that into a 404, same as every
 * other upstream call in this module.
 */
export async function fetchAyahAudio(reciter: number, surah: number): Promise<AyahAudio[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.quran.com/api/v4/recitations/${reciter}/by_chapter/${surah}?per_page=${PER_PAGE}`,
      { signal: controller.signal },
    );
    if (!res.ok) throw new Error(`quran.com responded ${res.status}`);

    const body = (await res.json()) as ByChapterResponse;
    if (!Array.isArray(body.audio_files)) throw new Error('quran.com returned an unexpected shape');

    const out: AyahAudio[] = [];
    for (const f of body.audio_files) {
      if (typeof f.verse_key !== 'string' || typeof f.url !== 'string') continue;
      // `verse_key` is "<surah>:<ayah>" -- only the ayah half is useful once
      // the surah is already known from the request.
      const ayah = Number(f.verse_key.split(':')[1]);
      if (!Number.isInteger(ayah)) continue;
      out.push({ ayah, url: `${AUDIO_CDN_BASE}${f.url}` });
    }
    if (out.length === 0) throw new Error(`no audio files for reciter ${reciter}, surah ${surah}`);
    out.sort((a, b) => a.ayah - b.ayah);
    return out;
  } finally {
    clearTimeout(timeout);
  }
}
