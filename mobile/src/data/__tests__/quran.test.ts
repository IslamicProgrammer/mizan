import AsyncStorage from '@react-native-async-storage/async-storage';

import { clampAyah, loadSurahs, loadSurahText, readingLabel, type Surah } from '../quran';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../env', () => ({
  getEnv: () => ({ apiUrl: 'http://test.local', googleClientId: 'test-client-id' }),
}));

const BAQARA: Surah = { number: 2, nameUzbek: 'Baqara', nameArabic: 'البقرة', ayahCount: 286, revelation: 'medinan' };
const IKHLAS: Surah = { number: 112, nameUzbek: 'Ixlos', nameArabic: 'الإخلاص', ayahCount: 4, revelation: 'meccan' };
const SURAHS = [BAQARA, IKHLAS];

afterEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('clampAyah -- the surah/ayah position arithmetic', () => {
  it('passes a valid ayah through unchanged', () => {
    expect(clampAyah(286, 45)).toBe(45);
  });

  it('floors a fractional ayah', () => {
    expect(clampAyah(4, 2.9)).toBe(2);
  });

  it('clamps an ayah above the surah\'s own count down to the last ayah', () => {
    // Exactly the case a stale saved position hits once a surah's bundled
    // data is corrected, or a deep link is simply wrong.
    expect(clampAyah(4, 999)).toBe(4);
  });

  it('clamps anything below 1 up to the first ayah', () => {
    expect(clampAyah(286, 0)).toBe(1);
    expect(clampAyah(286, -5)).toBe(1);
  });

  it('never returns an ayah outside a one-ayah surah\'s only ayah', () => {
    expect(clampAyah(1, 1)).toBe(1);
    expect(clampAyah(1, 50)).toBe(1);
  });

  it('falls back to 1 for a non-finite ayah', () => {
    expect(clampAyah(286, NaN)).toBe(1);
    expect(clampAyah(286, Infinity)).toBe(1);
  });
});

describe('readingLabel', () => {
  it('builds "Name, N-oyat" for a known position', () => {
    expect(readingLabel(SURAHS, { surah: 2, ayah: 45 })).toBe('Baqara, 45-oyat');
  });

  it('clamps the ayah into the label the same way the reader does', () => {
    expect(readingLabel(SURAHS, { surah: 112, ayah: 900 })).toBe('Ixlos, 4-oyat');
  });

  it('returns null when there is nothing to resume', () => {
    expect(readingLabel(SURAHS, null)).toBeNull();
  });

  it('returns null for a surah number this install\'s list does not recognise', () => {
    expect(readingLabel(SURAHS, { surah: 9999, ayah: 1 })).toBeNull();
  });
});

describe('loadSurahs', () => {
  it('fetches, caches and returns the server list on a clean first launch', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => SURAHS } as Response);

    const result = await loadSurahs();

    expect(result).toEqual(SURAHS);
    expect(JSON.parse((await AsyncStorage.getItem('mizan.quran.surahs.v1'))!)).toEqual(SURAHS);
  });

  it('never calls the network once the list is cached -- it has nothing to go stale against', async () => {
    await AsyncStorage.setItem('mizan.quran.surahs.v1', JSON.stringify(SURAHS));
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const result = await loadSurahs();

    expect(result).toEqual(SURAHS);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves to an empty list, never throws, on a first launch offline', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network request failed'));

    const result = await loadSurahs();

    expect(result).toEqual([]);
  });
});

describe('loadSurahText', () => {
  const AYAHS = [
    { number: 1, arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', uzbek: 'Айт: «У Аллоҳ ягонадир».' },
    { number: 2, arabic: 'اللَّهُ الصَّمَدُ', uzbek: 'Аллоҳ сомаддир.' },
  ];

  it('fetches, caches under this surah\'s own key, and returns the ayahs', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ surah: 112, ayahs: AYAHS }),
    } as Response);

    const result = await loadSurahText(112);

    expect(result).toEqual(AYAHS);
    expect(JSON.parse((await AsyncStorage.getItem('mizan.quran.text.v1.112'))!)).toEqual(AYAHS);
  });

  it('serves a surah already read from its own cache with no network call', async () => {
    await AsyncStorage.setItem('mizan.quran.text.v1.112', JSON.stringify(AYAHS));
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const result = await loadSurahText(112);

    expect(result).toEqual(AYAHS);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps two surahs\' caches independent', async () => {
    await AsyncStorage.setItem('mizan.quran.text.v1.112', JSON.stringify(AYAHS));

    const result = await loadSurahText(1);

    expect(result).toBeNull();
    expect(await AsyncStorage.getItem('mizan.quran.text.v1.1')).toBeNull();
  });

  it('returns null -- never throws, never a stale guess -- offline with nothing cached (Step 6)', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network request failed'));

    const result = await loadSurahText(2);

    expect(result).toBeNull();
  });

  it('ignores a malformed server response rather than caching garbage', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ surah: 112, ayahs: [{ arabic: 'only half a shape' }] }),
    } as Response);

    const result = await loadSurahText(112);

    expect(result).toBeNull();
    expect(await AsyncStorage.getItem('mizan.quran.text.v1.112')).toBeNull();
  });
});
