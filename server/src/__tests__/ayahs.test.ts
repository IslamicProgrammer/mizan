import { describe, expect, it } from 'vitest';

import { CURATED_AYAHS, pickAyah } from '../quran/ayahs.js';

describe('CURATED_AYAHS', () => {
  it('never offers Masad as a daily ayah', () => {
    // A condemnation of a named person is not daily reading. The range rule
    // picks short surahs and cannot pick appropriate ones, so this is pinned.
    expect(CURATED_AYAHS.some((a) => a.surah === 111)).toBe(false);
  });

  it('covers surahs 103 to 114 except Masad, which is an editorial omission', () => {
    expect(CURATED_AYAHS.length).toBe(55);
  });

  it('never includes a surah outside the curated range', () => {
    for (const ref of CURATED_AYAHS) {
      expect(ref.surah).toBeGreaterThanOrEqual(103);
      expect(ref.surah).toBeLessThanOrEqual(114);
    }
  });
});

describe('pickAyah', () => {
  it('is stable for the same day — two requests the same day must see the same ayah', () => {
    const a = pickAyah('2026-10-15');
    const b = pickAyah('2026-10-15');
    expect(a).toEqual(b);
  });

  it('differs across days', () => {
    const today = pickAyah('2026-10-15');
    const tomorrow = pickAyah('2026-10-16');
    expect(tomorrow).not.toEqual(today);
  });

  it('never indexes outside the supplied list', () => {
    // A handful of dates far apart, including ones whose day-count mod the
    // list length lands near zero either way the floor rounds.
    for (const d of ['1970-01-01', '1999-12-31', '2026-10-15', '2099-01-01']) {
      const ref = pickAyah(d);
      expect(CURATED_AYAHS).toContainEqual(ref);
    }
  });
});
