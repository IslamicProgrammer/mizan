/**
 * Playback for the Quran reader (task 33, Step 4).
 *
 * Highlighting is ayah-level by design, not by shortfall: a per-ayah MP3
 * means the playing ayah is always known exactly -- play file *n*, highlight
 * ayah *n*, advance when it ends. There is no timestamp to drift, and it
 * works identically for every reciter. `reducePlaylist` below is that
 * advance rule, kept pure and separate from the real `AudioPlayer` so the
 * rule itself -- stop at the end, never skip past it, a reciter change
 * starts clean -- can be tested without touching native audio at all.
 *
 * One `AudioPlayer`, not `expo-audio`'s own `AudioPlaylist`: the playlist
 * abstraction has no `setActiveForLockScreen`, and without it Android stops
 * background playback after about three minutes -- far short of a surah like
 * Baqara. A single player whose source this module replaces on every
 * advance keeps that lock-screen hook available, at the cost of owning the
 * advance logic ourselves, which is exactly what Step 8 asks to be tested.
 *
 * Audio URLs are fetched fresh every time and never cached (Step 6): a
 * cached URL list would not make the actual MP3 bytes available offline, so
 * caching it would only hide the real failure. A failed fetch here *is* the
 * honest "no internet" signal the reader shows on the play control.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { AudioPlayer } from 'expo-audio';

import { getEnv } from './env';

type AudioModule = typeof import('expo-audio');

let cached: AudioModule | null | undefined;

/**
 * Loaded through a guarded `require`, same pattern and same reason as
 * `auth.ts`'s `loadGoogle()`: `expo-audio` is a native module, and a static
 * `import` evaluates (and can throw) the moment this file is loaded at all
 * -- including inside a plain Jest unit test of `reducePlaylist` below,
 * which has no native runtime behind it and crashed on exactly that before
 * this guard existed. `require` rather than `await import()` for the same
 * reason `loadGoogle` gives: Jest's CommonJS environment cannot do a
 * dynamic import without `--experimental-vm-modules`.
 */
function loadAudioModule(): AudioModule {
  if (cached) return cached;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cached = require('expo-audio') as AudioModule;
  return cached;
}

export type AyahAudio = { ayah: number; url: string };

function isAyahAudio(v: unknown): v is AyahAudio {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.ayah === 'number' && typeof r.url === 'string';
}

/** `null` covers both "offline" and "this reciter has nothing for this
 * surah" -- the reader treats them the same way, a plain "audio unavailable
 * right now" message rather than a crash or a silent no-op. */
export async function loadAyahAudio(surah: number, reciter: number): Promise<AyahAudio[] | null> {
  try {
    const r = await fetch(`${getEnv().apiUrl}/quran/${surah}/audio/${reciter}`);
    if (!r.ok) return null;
    const body = await r.json();
    const ayahs = body?.ayahs;
    if (!Array.isArray(ayahs) || !ayahs.every(isAyahAudio)) return null;
    return ayahs;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------- pure advance */

export type PlaylistState = {
  ayahs: readonly AyahAudio[];
  /** Index into `ayahs` that is loaded into the player right now, or `null`
   * when nothing is. Distinct from `playing`: the last ayah of a surah stays
   * loaded (and highlighted) after it finishes, just paused. */
  index: number | null;
  playing: boolean;
};

export const IDLE_PLAYLIST: PlaylistState = { ayahs: [], index: null, playing: false };

export type PlaylistEvent =
  /** A fresh list is ready -- a surah opened, or the reciter changed.
   * Always replaces the list outright; there is no partial update. */
  | { type: 'load'; ayahs: readonly AyahAudio[]; startIndex: number }
  | { type: 'pause' }
  | { type: 'resume' }
  /** The ayah currently loaded finished playing on its own. */
  | { type: 'finished' };

/**
 * The one rule this module exists to get right: advance by exactly one on
 * `finished`, and stop -- do not loop, do not wrap -- once the last ayah has
 * played. `pause`/`resume` are no-ops with nothing loaded, which keeps a
 * stray tap on a just-unmounted control from reviving a dead player.
 */
export function reducePlaylist(state: PlaylistState, event: PlaylistEvent): PlaylistState {
  switch (event.type) {
    case 'load': {
      if (event.ayahs.length === 0) return IDLE_PLAYLIST;
      const startIndex = Math.min(Math.max(0, Math.floor(event.startIndex)), event.ayahs.length - 1);
      return { ayahs: event.ayahs, index: startIndex, playing: true };
    }
    case 'pause':
      return state.index === null ? state : { ...state, playing: false };
    case 'resume':
      return state.index === null ? state : { ...state, playing: true };
    case 'finished': {
      if (state.index === null) return state;
      const next = state.index + 1;
      if (next >= state.ayahs.length) return { ...state, playing: false };
      return { ...state, index: next, playing: true };
    }
    default:
      return state;
  }
}

/** The ayah number to highlight right now, or `null` when nothing is loaded. */
export function currentAyah(state: PlaylistState): number | null {
  return state.index === null ? null : state.ayahs[state.index]?.ayah ?? null;
}

/* --------------------------------------------------------------- the hook */

/**
 * Configured once per mount of the reader, not at module scope: setting the
 * audio mode is itself a declaration that this screen is about to play
 * long-form audio, and a screen that never opens the reader should not have
 * silently claimed background playback on the OS's behalf. `doNotMix` is
 * what makes this player a participant in Android's audio-focus system at
 * all -- `mixWithOthers` (the default) explicitly never requests focus,
 * which would mean this player could never be told to yield. `playsInSilentMode`
 * matches every other media app on iOS: a ringer switch mutes ringtones and
 * notifications, not audio a person explicitly pressed play on.
 */
async function configureAudioSession(): Promise<void> {
  await loadAudioModule()
    .setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    })
    .catch(() => {
      // A platform that refuses this call (web, mainly) simply plays without
      // the background guarantee -- never a reason to block the reader.
    });
}

export type Recitation = {
  playing: boolean;
  /** The ayah number currently loaded, or `null` before anything has played. */
  ayah: number | null;
  /** `false` once the last ayah of the current list has finished. */
  hasMore: boolean;
  /** Loads a new list and starts playing at `startIndex` (default 0). */
  start: (ayahs: readonly AyahAudio[], startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

/**
 * Owns exactly one native `AudioPlayer` for the lifetime of the component
 * that calls this, and keeps it in lockstep with `reducePlaylist`'s state:
 * `index`/`playing` changes replace the player's source and call
 * `play()`/`pause()`; the player's own `didJustFinish` event is the only
 * thing that ever dispatches `'finished'`. The player is released on
 * unmount, same contract as `useAudioPlayer` but explicit, because this
 * module needs the instance itself (for `setActiveForLockScreen`) rather
 * than the hook's managed one.
 */
export function useRecitation(): Recitation {
  const [state, dispatch] = useReducer(reducePlaylist, IDLE_PLAYLIST);
  const player = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    configureAudioSession();
    player.current = loadAudioModule().createAudioPlayer(null, { updateInterval: 500 });
    const sub = player.current.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) dispatch({ type: 'finished' });
    });
    return () => {
      sub.remove();
      player.current?.clearLockScreenControls();
      player.current?.remove();
      player.current = null;
    };
  }, []);

  // The one effect that actually drives the native player from the reducer's
  // state -- every control below only ever dispatches, never touches
  // `player.current` directly, so this is the single place source-swapping
  // and lock-screen activation can go wrong.
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const track = state.index === null ? null : state.ayahs[state.index];
    if (!track) {
      p.pause();
      p.clearLockScreenControls();
      return;
    }
    // `replace` is a no-op cost when the source is already this one --
    // cheaper to always call it than to track "did the index actually
    // change" ourselves and risk the two falling out of sync.
    p.replace({ uri: track.url });
    p.setActiveForLockScreen(true, { title: `${track.ayah}-oyat`, artist: 'Qur’on' });
    if (state.playing) p.play();
    else p.pause();
  }, [state.index, state.playing, state.ayahs]);

  const start = useCallback(
    (ayahs: readonly AyahAudio[], startIndex = 0) => dispatch({ type: 'load', ayahs, startIndex }),
    [],
  );
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  const resume = useCallback(() => dispatch({ type: 'resume' }), []);
  const stop = useCallback(() => dispatch({ type: 'load', ayahs: [], startIndex: 0 }), []);

  return useMemo(
    () => ({
      playing: state.playing,
      ayah: currentAyah(state),
      hasMore: state.index !== null && state.index < state.ayahs.length - 1,
      start,
      pause,
      resume,
      stop,
    }),
    [state, start, pause, resume, stop],
  );
}
