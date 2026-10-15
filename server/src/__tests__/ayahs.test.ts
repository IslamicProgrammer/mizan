import { describe, expect, it } from 'vitest';

import { CURATED_AYAHS, pickAyah } from '../quran/ayahs.js';

describe('CURATED_AYAHS', () => {
  it('has exactly sixty entries — every ayah of surahs 103 through 114', () => {
    expect(CURATED_AYAHS.length).toBe(60);
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
