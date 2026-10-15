/**
 * The reciter picker's data, from `api.quran.com` -- metadata, so it is
 * fetched here rather than from the phone, same rule as `ayah.ts`. Verified
 * live before this shipped: the endpoint returns exactly the twelve reciters
 * the brief counted, each with audio available through `audio.ts`'s
 * `fetchAyahAudio`.
 */
export type Reciter = { id: number; name: string; style: string | null };

const RECITATIONS_URL = 'https://api.quran.com/api/v4/resources/recitations?language=en';

/** Same budget as `ayah.ts`'s `fetchAyah` -- small JSON, no reason to wait longer. */
const FETCH_TIMEOUT_MS = 8_000;

type RecitationsResponse = {
  recitations?: Array<{ id?: unknown; reciter_name?: unknown; style?: unknown }>;
};

/**
 * Throws on any transport failure or an unrecognised shape -- the caller
 * (the `/quran/reciters` route) decides what that means for the app, same
 * division of labour as `fetchAyah`.
 */
export async function fetchReciters(): Promise<Reciter[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(RECITATIONS_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`quran.com responded ${res.status}`);

    const body = (await res.json()) as RecitationsResponse;
    if (!Array.isArray(body.recitations)) throw new Error('quran.com returned an unexpected shape');

    const reciters = body.recitations
      .filter((r): r is { id: number; reciter_name: string; style?: unknown } =>
        typeof r.id === 'number' && typeof r.reciter_name === 'string',
      )
      .map((r) => ({ id: r.id, name: r.reciter_name, style: typeof r.style === 'string' ? r.style : null }));

    if (reciters.length === 0) throw new Error('quran.com returned no reciters');
    // Alphabetical by name, with Mujawwad/Murattal/Muallim style breaking the
    // tie -- quran.com's own ordering is by internal id, which groups neither
    // alphabetically nor by reciter, and reads as arbitrary in a picker.
    reciters.sort((a, b) => a.name.localeCompare(b.name) || (a.style ?? '').localeCompare(b.style ?? ''));
    return reciters;
  } finally {
    clearTimeout(timeout);
  }
}
