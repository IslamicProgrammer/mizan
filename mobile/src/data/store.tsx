/**
 * App state for the app.
 *
 * One store so screens agree with each other — marking Asr prayed on the prayer
 * sheet has to move the streak on the garden screen, or the app tells the user
 * nothing about whether the flows connect.
 *
 * Every field here is a real, persisted record of something the user did.
 * There used to be a `MOCK` constant holding invented history, streaks,
 * charity figures and blocked apps; it is gone. A screen whose feature does
 * not exist yet (app-blocking, a signed-in account, a published charity
 * report) shows an honest empty state instead of a fabricated number — see
 * focus/, charity/ and settings/ under app/.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, View } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { FIVE, type Madhhab, type PrayerId } from './prayer';

export type PrayerMark = 'done' | 'late' | 'qaza' | null;

/**
 * One day in the garden. `kept` is how many of the five were prayed, which is
 * the plant's growth stage. `rest` marks a cycle-mode day: the plant pauses, it
 * does not wither, and the streak is not broken. `updatedAt` is when this
 * device last wrote the record, in epoch milliseconds — the server's merge
 * uses it to let a correction win over a stale value instead of only ever
 * taking the higher count. It is optional because an install that predates
 * this field will never set it, and must keep syncing exactly as it does
 * today.
 */
export type DayRecord = { kept: number; rest?: boolean; updatedAt?: number };

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type Settings = {
  madhhab: Madhhab;
  gender: 'man' | 'woman' | null;
  scanObject: 'mat' | 'sink' | 'both';
  fajrAlarm: boolean;
  focusEnabled: boolean;
  cycleMode: boolean;
  nightTheme: boolean;
  notifyBefore: number; // minutes
};

type State = {
  onboarded: boolean;
  settings: Settings;
  /** today's marks, keyed by prayer */
  marks: Record<PrayerId, PrayerMark>;
  answers: Record<string, string[]>;
  /** Tasbih survives navigation — losing a count of 99 on a back tap is unforgivable. */
  tasbih: { count: number; targetIdx: number };
  /**
   * Outstanding make-up prayers, per prayer. This is the one screen where the
   * number IS the point — a user records how many they owe, and until this
   * was added nothing persisted it past the next navigation.
   */
  qaza: Record<PrayerId, number>;
  /**
   * Total minutes of focus time ever banked, across every completed
   * blocking session. Starts at zero on a fresh install — there is no
   * app-blocking yet, so there is nothing to have earned before today.
   */
  focusMinutes: number;
  /**
   * The day `marks` belongs to. Without this, yesterday's marks are still
   * "today" when the app is reopened: the garden thinks the day is already
   * prayed, the streak is wrong, and yesterday is never written to history.
   */
  marksDate: string;
  /**
   * When `marks` last changed. Today's record is derived, not stored in
   * `history`, so this is what lets a correction to today's count (marking,
   * then unmarking a mis-tap) carry a newer `updatedAt` than whatever was
   * last synced — without it, today would never be able to win a merge
   * against its own stale earlier value.
   */
  marksUpdatedAt?: number;
  /** past days, keyed YYYY-MM-DD. Today is derived from `marks`, not stored. */
  history: Record<string, DayRecord>;
  /**
   * The `ymd()` date the app first hydrated on this install, set once when it
   * is found absent and never moved afterward. A day before this date is not
   * a day the user failed to pray - it is a day the app was not installed
   * yet, and the garden and streak both need to tell the two apart.
   */
  startedAt?: string;
};

const DEFAULTS: State = {
  onboarded: false,
  settings: {
    madhhab: 'hanafi',
    gender: null,
    scanObject: 'mat',
    fajrAlarm: true,
    focusEnabled: true,
    cycleMode: false,
    nightTheme: false,
    notifyBefore: 15,
  },
  marks: { fajr: null, sunrise: null, dhuhr: null, asr: null, maghrib: null, isha: null },
  marksDate: ymd(new Date()),
  answers: {},
  history: {},
  tasbih: { count: 0, targetIdx: 0 },
  qaza: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  focusMinutes: 0,
};

const EMPTY_MARKS: Record<PrayerId, PrayerMark> = {
  fajr: null, sunrise: null, dhuhr: null, asr: null, maghrib: null, isha: null,
};

const keptIn = (m: Record<PrayerId, PrayerMark>) =>
  FIVE.filter((p) => m[p] === 'done' || m[p] === 'late').length;

/**
 * Close out any day that has ended.
 *
 * Called on hydrate and whenever the app returns to the foreground, because
 * people leave the app open overnight and a date that only advances on cold
 * start would never advance at all.
 */
function rollOver(state: State): State {
  const today = ymd(new Date());
  if (state.marksDate === today) return state;
  // The real moment this day was last edited, not the moment roll-over
  // happens to run. Roll-over fires on hydrate and on every foreground, so
  // stamping `Date.now()` here would claim an untouched day was last written
  // whenever the app happened to be reopened — two days later, say — letting
  // that stale record beat a genuine, earlier correction from another
  // device. Falling back to `Date.now()` only when there is no edit time at
  // all keeps that fallback for the one case it is honest for: a day with no
  // recorded edit time to carry forward.
  const updatedAt = state.marksUpdatedAt ?? Date.now();
  return {
    ...state,
    history: {
      ...state.history,
      // a cycle-mode day is a rest day, not a day of zero prayers. Stamped
      // on write, same as any other history entry, so a later repair to
      // this now-archived day can still win against it.
      [state.marksDate]: state.settings.cycleMode
        ? { kept: 0, rest: true, updatedAt }
        : { kept: keptIn(state.marks), updatedAt },
    },
    marks: { ...EMPTY_MARKS },
    marksDate: today,
  };
}

/* ------------------------------------------------------------------ store */

type Store = State & {
  setMark: (id: PrayerId, mark: PrayerMark) => void;
  patchSettings: (p: Partial<Settings>) => void;
  setAnswers: (a: Record<string, string[]>) => void;
  finishOnboarding: () => void;
  reset: () => void;
  /** prayers kept today, out of five — the plant's stage */
  keptToday: number;
  /** last `n` days, oldest first, today last */
  recentDays: (n: number) => { date: string; rec: DayRecord; today: boolean }[];
  /**
   * Make up one prayer on a past day. Finch's model: a missed day is not a
   * blank to be ashamed of, it is something you can still repair — and here the
   * repair is a real act, a qaza prayer actually made up.
   */
  repairDay: (date: string) => void;
  /** consecutive days with at least one prayer, rest days not breaking it */
  streak: number;
  setTasbih: (t: { count: number; targetIdx: number }) => void;
  /** Sets one prayer's outstanding count. Clamped at zero — a negative debt
   * of prayers owed is meaningless. */
  setQaza: (id: PrayerId, n: number) => void;
  /**
   * Banks minutes from a focus session that genuinely completed. Call this
   * only at completion, never when a session is abandoned — an abandoned
   * session is not focus time. `n` is floored and clamped so a miscomputed
   * or negative duration can never reduce the running total.
   */
  addFocusMinutes: (n: number) => void;
};

const Ctx = createContext<Store | null>(null);
const KEY = 'mizan.state.v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : null;
        setState((s) => {
          const next = { ...s, ...(saved ?? {}) };
          if (!next.marksDate) next.marksDate = ymd(new Date());
          // Set once, the first time it is found missing — a fresh install,
          // or an install that predates this field. Everything before today
          // is then "the app wasn't here yet", not "missed", which is the
          // honest fix for the blank history a fresh install starts with
          // (an invented fourteen days was the dishonest one).
          if (!next.startedAt) next.startedAt = ymd(new Date());
          return rollOver(next);
        });
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  // An app left open overnight never cold-starts, so the date has to be
  // re-checked when it returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setState(rollOver);
    });
    return () => sub.remove();
  }, []);

  const value = useMemo<Store>(() => {
    const keptToday = keptIn(state.marks);

    const recordFor = (date: string, today: boolean): DayRecord => {
      if (!today) return state.history[date] ?? { kept: 0 };
      // Today isn't written into `history` until roll-over, so its own
      // `updatedAt` has to come from `marksUpdatedAt` instead - the
      // timestamp of the last `setMark` - or a mis-tap corrected before
      // midnight would carry no timestamp at all.
      const updatedAt = state.marksUpdatedAt;
      // Cycle mode must be read live, not only at midnight: `rollOver` is
      // the only place that ever set `rest: true` before this, so for the
      // whole of a rest day the live "today" record still claimed a full
      // day's quota was owed. This is the same test `rollOver` applies when
      // the day ends — one source of truth for "is today a rest day",
      // whether the day is still open or already archived.
      if (state.settings.cycleMode) {
        return updatedAt !== undefined
          ? { kept: keptToday, rest: true, updatedAt }
          : { kept: keptToday, rest: true };
      }
      return updatedAt !== undefined ? { kept: keptToday, updatedAt } : { kept: keptToday };
    };

    const recentDays = (n: number) => {
      const out: { date: string; rec: DayRecord; today: boolean }[] = [];
      const now = new Date();
      for (let i = n - 1; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = ymd(d);
        out.push({ date: key, rec: recordFor(key, i === 0), today: i === 0 });
      }
      return out;
    };

    // Rest days neither break the streak nor extend it — the garden pauses.
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 400; i += 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = ymd(d);
      const rec = recordFor(dateKey, i === 0);
      // A day before the user started is not a day they broke the streak on
      // — the app was not installed yet, so it is skipped exactly like a
      // rest day instead of ending the count.
      const beforeStart = state.startedAt !== undefined && dateKey < state.startedAt;
      if (rec.rest || beforeStart) continue;
      if (rec.kept > 0) streak += 1;
      // today counting zero just means the day is not over yet
      else if (i > 0) break;
    }

    return {
      ...state,
      keptToday,
      recentDays,
      streak,
      setMark: (id, mark) =>
        setState((s) => ({ ...s, marks: { ...s.marks, [id]: mark }, marksUpdatedAt: Date.now() })),
      patchSettings: (p) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } })),
      setAnswers: (answers) => setState((s) => ({ ...s, answers })),
      setTasbih: (tasbih) => setState((s) => ({ ...s, tasbih })),
      setQaza: (id, n) =>
        setState((s) => ({
          ...s,
          // NaN and a fractional count are both meaningless for a number of
          // prayers owed; falling through to 0 keeps this one expression
          // rather than a second guard no caller can reach today.
          qaza: { ...s.qaza, [id]: Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0 },
        })),
      repairDay: (date) =>
        setState((s) => {
          const cur = s.history[date] ?? { kept: 0 };
          if (cur.rest || cur.kept >= 5) return s;
          return {
            ...s,
            history: { ...s.history, [date]: { ...cur, kept: cur.kept + 1, updatedAt: Date.now() } },
          };
        }),
      addFocusMinutes: (n) =>
        setState((s) => ({
          ...s,
          // A session that ends early, or a duration derived from a clock
          // jump, must never subtract from minutes already banked — only a
          // finite, positive amount is added; anything else adds nothing.
          focusMinutes: s.focusMinutes + (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0),
        })),
      finishOnboarding: () => setState((s) => ({ ...s, onboarded: true })),
      // Wipes real history rather than replacing it with invented days.
      // `startedAt` is set to today because a fresh start has no past in
      // this app to judge — the same honest rule a first install gets.
      reset: () => setState({ ...DEFAULTS, startedAt: ymd(new Date()) }),
    };
  }, [state]);

  // Hold the first frame until storage is read, or the app flashes the
  // onboarding screen at someone who already finished it. Render the page
  // colour rather than null: `null` is a white frame, which on a slow device
  // reads as a crash and clashes with the splash we just came from.
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: '#F8F2EA' }} />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

/** Stable helper for screens that only need a settings field. */
export function useSettings() {
  return useStore().settings;
}

export const useMockCallback = useCallback;
