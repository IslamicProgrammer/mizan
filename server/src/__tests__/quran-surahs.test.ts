import { describe, expect, it } from 'vitest';

import { CURATED_AYAHS } from '../quran/ayahs.js';
import { surahByNumber, SURAHS } from '../quran/surahs.js';

describe('SURAHS', () => {
  it('has all 114 surahs, each exactly once', () => {
    expect(SURAHS.length).toBe(114);
    expect(new Set(SURAHS.map((s) => s.number)).size).toBe(114);
    for (let n = 1; n <= 114; n += 1) {
      expect(SURAHS.some((s) => s.number === n)).toBe(true);
    }
  });

  it('ayah counts sum to the standard 6236 -- a mistyped count would throw this off', () => {
    expect(SURAHS.reduce((sum, s) => sum + s.ayahCount, 0)).toBe(6236);
  });

  it('names every short surah the same as the daily ayah already does', () => {
    // The daily ayah (task 31) and this list must never disagree about what
    // a surah is called -- a user who recognises "Ixlos" on the home card
    // should see the same name in the reader, not "Ikhlas" or "Al-Ikhlas".
    for (const ref of CURATED_AYAHS) {
      expect(surahByNumber(ref.surah)?.nameUzbek).toBe(ref.surahName);
    }
  });

  it('every surah has a non-empty Arabic name and a positive ayah count', () => {
    for (const s of SURAHS) {
      expect(s.nameArabic.length).toBeGreaterThan(0);
      expect(s.nameUzbek.length).toBeGreaterThan(0);
      expect(s.ayahCount).toBeGreaterThan(0);
      expect(['meccan', 'medinan']).toContain(s.revelation);
    }
  });
});

describe('surahByNumber', () => {
  it('finds a known surah', () => {
    expect(surahByNumber(2)?.nameUzbek).toBe('Baqara');
  });

  it('returns undefined for a number outside 1-114', () => {
    expect(surahByNumber(0)).toBeUndefined();
    expect(surahByNumber(115)).toBeUndefined();
  });
});
