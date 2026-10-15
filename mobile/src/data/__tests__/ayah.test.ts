import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadDailyAyah, type DailyAyah } from '../ayah';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../env', () => ({
  getEnv: () => ({ apiUrl: 'http://test.local', googleClientId: 'test-client-id' }),
}));

const SAMPLE: DailyAyah = {
  date: '2026-10-15',
  reference: 'Ixlos 112:1',
  surah: 112,
  ayah: 1,
  arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
  uzbek: 'Айт: «У Аллоҳ ягонадир».',
};

const TODAY = new Date('2026-10-15T10:00:00');
const YESTERDAY: DailyAyah = { ...SAMPLE, date: '2026-10-14', reference: 'Falaq 113:1' };

afterEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('loadDailyAyah — the offline-first cache-and-fetch path', () => {
  it('fetches, caches and returns the server result on a clean first launch', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => SAMPLE,
    } as Response);

    const result = await loadDailyAyah(TODAY);

    expect(result).toEqual(SAMPLE);
    expect(JSON.parse((await AsyncStorage.getItem('mizan.ayah.v1'))!)).toEqual(SAMPLE);
  });

  it('never calls the network when today is already cached', async () => {
    await AsyncStorage.setItem('mizan.ayah.v1', JSON.stringify(SAMPLE));
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const result = await loadDailyAyah(TODAY);

    expect(result).toEqual(SAMPLE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to yesterday\'s cached ayah when the network is down, rather than clearing it', async () => {
    await AsyncStorage.setItem('mizan.ayah.v1', JSON.stringify(YESTERDAY));
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network request failed'));

    const result = await loadDailyAyah(TODAY);

    expect(result).toEqual(YESTERDAY);
    expect(JSON.parse((await AsyncStorage.getItem('mizan.ayah.v1'))!)).toEqual(YESTERDAY);
  });

  it('falls back to yesterday\'s cached ayah when the server itself has nothing (its own 404)', async () => {
    await AsyncStorage.setItem('mizan.ayah.v1', JSON.stringify(YESTERDAY));
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response);

    const result = await loadDailyAyah(TODAY);

    expect(result).toEqual(YESTERDAY);
  });

  it('renders nothing — resolves null — on a first launch offline with nothing cached', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network request failed'));

    const result = await loadDailyAyah(TODAY);

    expect(result).toBeNull();
  });

  it('ignores a cache entry that does not look like a DailyAyah, the same as no cache at all', async () => {
    await AsyncStorage.setItem('mizan.ayah.v1', JSON.stringify({ garbage: true }));
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network request failed'));

    const result = await loadDailyAyah(TODAY);

    expect(result).toBeNull();
  });

  it('ignores a malformed server response and falls back to the cache instead of throwing', async () => {
    await AsyncStorage.setItem('mizan.ayah.v1', JSON.stringify(YESTERDAY));
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ arabic: 'only half a shape' }),
    } as Response);

    const result = await loadDailyAyah(TODAY);

    expect(result).toEqual(YESTERDAY);
  });
});
