/**
 * The curated list the daily ayah (`GET /ayah/today`) is drawn from, and the
 * pure function that picks one of them for a given calendar day.
 *
 * Not all 6,236 ayahs. Sodiq's Uzbek translation carries his own tafsir
 * folded into the verse rather than kept separate, so a single ayah from the
 * middle of a long legal passage can run to several Uzbek paragraphs --
 * nothing close to fitting a home-screen card -- and a verse pulled at
 * random from mid-argument (a conditional clause, a cross-reference to the
 * verse before it) is poor daily reading standing alone regardless of
 * length.
 *
 * Rather than hand-picking "famous verses that feel short enough" -- a
 * judgement call that is easy to get subtly wrong one surah at a time --
 * this list is every single ayah of surahs 103 through 114: the shortest,
 * most widely memorized surahs in the Qur'an, the first ones a new reciter
 * (and most Uzbek schoolchildren) learns. Every verse in them is short *by
 * construction*, not by curation of individual verses. Checked live against
 * `api.alquran.cloud` before this shipped: the longest Uzbek rendering in
 * the whole list, tafsir included, is ~320 characters -- the shortest are
 * one short clause. That gives exactly sixty entries, which is also where
 * the number "roughly sixty" above came from: it is not a round target
 * chosen in advance, it is what these twelve surahs add up to.
 */
export type AyahRef = { surah: number; ayah: number; surahName: string };

/**
 * Surah 111 (Masad) is deliberately absent despite falling in the range. It is
 * a condemnation of a named person, and "his wealth availed him not" is not
 * what should greet someone opening a prayer app in the morning. The range rule
 * picks short surahs; it cannot pick appropriate ones, so this is an editorial
 * exception rather than a bug in the rule.
 */
/** One block per surah, oldest-numbered Meccan surah first within the range,
 * so the list reads in the same order the Qur'an itself places them. */
const SURAHS: { surah: number; name: string; ayahCount: number }[] = [
  { surah: 103, name: 'Asr', ayahCount: 3 },
  { surah: 104, name: 'Humaza', ayahCount: 9 },
  { surah: 105, name: 'Fil', ayahCount: 5 },
  { surah: 106, name: 'Quraysh', ayahCount: 4 },
  { surah: 107, name: "Mo'un", ayahCount: 7 },
  { surah: 108, name: 'Kavsar', ayahCount: 3 },
  { surah: 109, name: 'Kofirun', ayahCount: 6 },
  { surah: 110, name: 'Nasr', ayahCount: 3 },
  { surah: 112, name: 'Ixlos', ayahCount: 4 },
  { surah: 113, name: 'Falaq', ayahCount: 5 },
  { surah: 114, name: 'Nos', ayahCount: 6 },
];

export const CURATED_AYAHS: readonly AyahRef[] = SURAHS.flatMap(({ surah, name, ayahCount }) =>
  Array.from({ length: ayahCount }, (_, i) => ({ surah, ayah: i + 1, surahName: name })),
);

/**
 * Deterministic, not random: the same `dateKey` always lands on the same
 * entry, so two people who open the app on the same day can actually talk
 * about the ayah they both saw. Days-since-epoch mod the list length is
 * enough to guarantee that -- it does not need to be a good hash, only a
 * stable one, and this is easier to audit by hand than a string hash would
 * be. `dateKey` is parsed with an explicit `T00:00:00Z` for the same reason
 * `merge.ts`'s `isValidDateKey` does: parsing a bare `YYYY-MM-DD` would
 * otherwise go through the running process's local timezone, which this
 * function must not depend on.
 */
export function pickAyah(dateKey: string, list: readonly AyahRef[] = CURATED_AYAHS): AyahRef {
  const days = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86_400_000);
  const idx = ((days % list.length) + list.length) % list.length;
  // `idx` is always `0 <= idx < list.length` by construction above — the
  // double modulo is exactly what makes a negative `days` (any date before
  // 1970) safe — so a non-null list access here can never actually be out
  // of range; `noUncheckedIndexedAccess` cannot see that invariant itself.
  return list[idx]!;
}
