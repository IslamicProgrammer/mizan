import { currentAyah, IDLE_PLAYLIST, loadAyahAudio, reducePlaylist, type PlaylistState } from '../recitation';

jest.mock('../env', () => ({
  getEnv: () => ({ apiUrl: 'http://test.local', googleClientId: 'test-client-id' }),
}));

afterEach(() => {
  jest.restoreAllMocks();
});

const LIST = [
  { ayah: 1, url: 'https://verses.quran.com/Alafasy/mp3/112001.mp3' },
  { ayah: 2, url: 'https://verses.quran.com/Alafasy/mp3/112002.mp3' },
  { ayah: 3, url: 'https://verses.quran.com/Alafasy/mp3/112003.mp3' },
];

describe('reducePlaylist -- the playlist advance', () => {
  it('loading a list starts at the requested index, playing', () => {
    const state = reducePlaylist(IDLE_PLAYLIST, { type: 'load', ayahs: LIST, startIndex: 1 });

    expect(state.index).toBe(1);
    expect(state.playing).toBe(true);
    expect(currentAyah(state)).toBe(2);
  });

  it('clamps an out-of-range startIndex into the list rather than landing outside it', () => {
    const tooHigh = reducePlaylist(IDLE_PLAYLIST, { type: 'load', ayahs: LIST, startIndex: 99 });
    const negative = reducePlaylist(IDLE_PLAYLIST, { type: 'load', ayahs: LIST, startIndex: -1 });

    expect(tooHigh.index).toBe(2);
    expect(negative.index).toBe(0);
  });

  it('loading an empty list resets to idle rather than a dangling index', () => {
    const loaded = reducePlaylist(IDLE_PLAYLIST, { type: 'load', ayahs: LIST, startIndex: 0 });
    const state = reducePlaylist(loaded, { type: 'load', ayahs: [], startIndex: 0 });

    expect(state).toEqual(IDLE_PLAYLIST);
  });

  it('finished advances to the next ayah and keeps playing', () => {
    const loaded = reducePlaylist(IDLE_PLAYLIST, { type: 'load', ayahs: LIST, startIndex: 0 });

    const state = reducePlaylist(loaded, { type: 'finished' });

    expect(state.index).toBe(1);
    expect(state.playing).toBe(true);
    expect(currentAyah(state)).toBe(2);
  });

  it('finished on the last ayah stops rather than wrapping or going out of bounds', () => {
    const atLast = reducePlaylist(IDLE_PLAYLIST, { type: 'load', ayahs: LIST, startIndex: 2 });

    const state = reducePlaylist(atLast, { type: 'finished' });

    expect(state.index).toBe(2); // the last ayah stays loaded (and highlighted)...
    expect(state.playing).toBe(false); // ...just not playing
    expect(currentAyah(state)).toBe(3);
  });

  it('advancing through an entire surah visits every ayah exactly once, in order', () => {
    let state: PlaylistState = reducePlaylist(IDLE_PLAYLIST, { type: 'load', ayahs: LIST, startIndex: 0 });
    const seen = [currentAyah(state)];
    while (state.playing) {
      state = reducePlaylist(state, { type: 'finished' });
      seen.push(currentAyah(state));
    }
    expect(seen).toEqual([1, 2, 3, 3]); // the trailing 3 is the stopped-but-still-loaded last ayah
  });

  it('pause stops playback without losing the loaded ayah', () => {
    const loaded = reducePlaylist(IDLE_PLAYLIST, { type: 'load', ayahs: LIST, startIndex: 1 });

    const state = reducePlaylist(loaded, { type: 'pause' });

    expect(state.playing).toBe(false);
    expect(currentAyah(state)).toBe(2);
  });

  it('resume after pause continues from the same ayah, not the start', () => {
    const paused = reducePlaylist(
      reducePlaylist(IDLE_PLAYLIST, { type: 'load', ayahs: LIST, startIndex: 1 }),
      { type: 'pause' },
    );

    const state = reducePlaylist(paused, { type: 'resume' });

    expect(state.playing).toBe(true);
    expect(currentAyah(state)).toBe(2);
  });

  it('pause, resume and finished are no-ops with nothing loaded', () => {
    expect(reducePlaylist(IDLE_PLAYLIST, { type: 'pause' })).toEqual(IDLE_PLAYLIST);
    expect(reducePlaylist(IDLE_PLAYLIST, { type: 'resume' })).toEqual(IDLE_PLAYLIST);
    expect(reducePlaylist(IDLE_PLAYLIST, { type: 'finished' })).toEqual(IDLE_PLAYLIST);
  });
});

describe('currentAyah', () => {
  it('is null for the idle state', () => {
    expect(currentAyah(IDLE_PLAYLIST)).toBeNull();
  });
});

describe('loadAyahAudio', () => {
  it('returns the ayah list on a clean response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ surah: 112, reciter: 7, ayahs: LIST }),
    } as Response);

    const result = await loadAyahAudio(112, 7);

    expect(result).toEqual(LIST);
  });

  it('returns null -- the reader\'s "offline" signal -- when the network fails', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network request failed'));

    const result = await loadAyahAudio(112, 7);

    expect(result).toBeNull();
  });

  it('returns null when the server itself has nothing for this pair', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response);

    const result = await loadAyahAudio(112, 999);

    expect(result).toBeNull();
  });

  it('returns null rather than a half-valid list on a malformed response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ayahs: [{ ayah: 1 }] }),
    } as Response);

    const result = await loadAyahAudio(112, 7);

    expect(result).toBeNull();
  });
});
