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
import * as SecureStore from 'expo-secure-store';
import { AppState, View } from 'react-native';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { BlockMode } from '../../modules/app-watch';

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
 *
 * `prayers` names which of the five were actually kept, so a stats screen can
 * say *which* prayer keeps slipping rather than only a nightly total. It is
 * optional and `kept` stays authoritative for the count — `prayers.length <=
 * kept`, never `===`, because a generic repair (`repairDay` with no prayer
 * named) has to be able to raise the count without claiming to know which
 * prayer it was for. A record written before this field existed has none,
 * and must not be guessed at: that is exactly the fabricated-numbers defect
 * this app has spent days removing.
 */
export type DayRecord = { kept: number; rest?: boolean; prayers?: PrayerId[]; updatedAt?: number };

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
  /**
   * The "Sinov rejimi" switch on focus/apps.tsx. Persisted so the switch
   * reads back correctly across a normal navigation, but it is never read
   * on app start to decide whether to start the native service -- see
   * `reconcileTestBlock` in focus/apps.tsx for why a forgotten "on" must
   * resolve to "off", not to a silently restarted background service.
   */
  testBlockNow: boolean;
  /**
   * The choice on focus/apps.tsx's segmented control (task 23): `'remind'`
   * shows the translucent card and lets the user carry on into the blocked
   * app; `'lock'` drops that path entirely. Defaults to `'remind'` --
   * both for a fresh install and for an install that persisted its
   * settings before this field existed, since a missing field reads back
   * as `undefined` here, never as `'lock'`. Read at the moment a session
   * actually starts (the test switch, or a real session once one is wired
   * to it), not cached anywhere native -- the native side only ever knows
   * the mode a given `startFocus` call told it.
   */
  blockMode: BlockMode;
};

export type State = {
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
   * The same minutes as `focusMinutes`, bucketed by the `ymd()` day they were
   * earned on. `focusMinutes` alone cannot draw a weekly chart honestly —
   * there is no way to recover which day a total belongs to — so this is
   * written alongside it rather than derived from it later.
   */
  focusByDay: Record<string, number>;
  /**
   * Package names the user chose to block during focus sessions -- never a
   * cached label or icon alongside them, which would go stale the moment
   * the user changes locale or the app updates its own name. Rendered rows
   * always re-resolve the label and icon from `installedApps()` at the
   * moment they are shown.
   */
  blockedApps: string[];
  /**
   * Each entry is one cycle: the day the user turned the mode on, and the day
   * they turned it off. `to` is absent while a cycle is still open. This is
   * health data the user never asked us to send anywhere, so it stays on the
   * device and is never part of the synced profile — see `stateForSync`
   * below. It lives in memory as part of `State` like everything else, but
   * `StoreProvider` persists it to `expo-secure-store`, not to the
   * `AsyncStorage` blob the rest of this object is written to — see the
   * comment above that split for why.
   */
  cycles: { from: string; to?: string }[];
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

/**
 * The subset of `State` that Task 8's sync call may send to `PUT /profile`.
 * `cycles` is dropped here, at the one place the full state object exists,
 * rather than at the call site — the app promises a woman using cycle mode
 * that this never leaves her phone, and that promise only holds if there is
 * no path from this object to the network, not just a convention that the
 * caller remembers to follow. Task 8 should build its request body from this
 * function's return value, never from `state` directly.
 */
export function stateForSync(state: State): Omit<State, 'cycles'> {
  const { cycles, ...syncable } = state;
  return syncable;
}

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
    testBlockNow: false,
    blockMode: 'remind',
  },
  marks: { fajr: null, sunrise: null, dhuhr: null, asr: null, maghrib: null, isha: null },
  marksDate: ymd(new Date()),
  answers: {},
  history: {},
  tasbih: { count: 0, targetIdx: 0 },
  qaza: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  focusMinutes: 0,
  focusByDay: {},
  blockedApps: [],
  cycles: [],
};

const EMPTY_MARKS: Record<PrayerId, PrayerMark> = {
  fajr: null, sunrise: null, dhuhr: null, asr: null, maghrib: null, isha: null,
};

const keptPrayers = (m: Record<PrayerId, PrayerMark>) =>
  FIVE.filter((p) => m[p] === 'done' || m[p] === 'late');

const keptIn = (m: Record<PrayerId, PrayerMark>) => keptPrayers(m).length;

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
        : { kept: keptIn(state.marks), prayers: keptPrayers(state.marks), updatedAt },
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
  repairDay: (date: string, prayer?: PrayerId) => void;
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
  /** Adds `pkg` to `blockedApps` if it is absent, removes it if present. */
  toggleBlockedApp: (pkg: string) => void;
  /**
   * Adopts `history` from Task 8's push-then-pull round trip against
   * `PUT /profile`. Only `history` is ever written back from the network —
   * `settings`, `qaza`, `focusMinutes` and the rest are plain
   * last-write-wins on the server (see `sync/merge.ts`'s comment on that
   * trade-off), so pulling them down here would let a stale install
   * silently undo a choice made on this device. `history` is the one field
   * with a real merge, which is exactly what makes it safe to adopt
   * wholesale: the push just before this always included this device's own
   * current `history`, so the server's response is a strict union of it
   * with whatever other devices had, never a loss.
   *
   * Today's key is dropped on arrival regardless of what the server sends
   * back. Task 8 synthesizes today into the *request* body so the
   * correction mechanism can see it, but today is never a key this store
   * itself keeps in `history` — that is `marks`'s job until the next
   * roll-over — and keeping it here would double-count today the moment a
   * screen sums `history` plus `keptToday` (`settings/profile.tsx` does
   * exactly that).
   */
  applyRemoteHistory: (remoteHistory: Record<string, DayRecord>) => void;
};

const Ctx = createContext<Store | null>(null);
const KEY = 'mizan.state.v1';
// A separate key, not a field inside `KEY`'s JSON, because the two live in
// different stores entirely — see the persistence effect below.
const CYCLES_KEY = 'mizan.cycles.v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  // Decided once, at hydrate, and read (never awaited) by every later write.
  // `SecureStore` does not exist on web — which this project's `npm run
  // smoke` exercises in a real browser — and the one thing worse than cycle
  // history not surviving a web reload is writing it into AsyncStorage the
  // moment Keystore/Keychain is unavailable, which is exactly the store this
  // task removes it from.
  const secureAvailable = useRef(false);

  useEffect(() => {
    (async () => {
      let cycles: State['cycles'] = [];
      try {
        secureAvailable.current = await SecureStore.isAvailableAsync();
        if (secureAvailable.current) {
          const rawCycles = await SecureStore.getItemAsync(CYCLES_KEY);
          cycles = rawCycles ? JSON.parse(rawCycles) : [];
        }
      } catch {
        // Treat a broken read the same as "unavailable" — losing this one
        // field is far better than a crash loop on hydrate.
        secureAvailable.current = false;
      }

      AsyncStorage.getItem(KEY)
        .then((raw) => {
          const saved = raw ? JSON.parse(raw) : null;
          setState((s) => {
            // An install made before this change may still have `cycles`
            // sitting inside the old AsyncStorage blob. Secure storage wins
            // once it has anything, but on the one upgrade where it does
            // not yet, falling back to that legacy value migrates it
            // forward instead of silently discarding a real cycle history.
            const migrated = cycles.length > 0 ? cycles : (saved?.cycles ?? []);
            const next = { ...s, ...(saved ?? {}), cycles: migrated };
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
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // `cycles` is cut from the object written here, not just from
    // `stateForSync`'s network copy — AsyncStorage is plaintext in the app's
    // private directory and swept into Android Auto Backup, and the whole
    // point of this split is that nothing containing a cycle date ever
    // reaches either path.
    const { cycles, ...rest } = state;
    AsyncStorage.setItem(KEY, JSON.stringify(rest)).catch(() => {});
    if (secureAvailable.current) {
      SecureStore.setItemAsync(CYCLES_KEY, JSON.stringify(cycles)).catch(() => {});
    }
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
      patchSettings: (p) =>
        setState((s) => {
          const settings = { ...s.settings, ...p };
          // The open/closed state of the last entry is the guard, not the
          // incoming flag by itself — if `cycleMode` is somehow already
          // `true` when this fires again (e.g. a rapid double-tap replaying
          // the same patch), an open entry already exists and must not get
          // a sibling. Likewise closing only ever touches an entry that is
          // actually open.
          const last = s.cycles[s.cycles.length - 1];
          const open = last !== undefined && last.to === undefined;
          let cycles = s.cycles;
          if ('cycleMode' in p && p.cycleMode === true && !open) {
            cycles = [...s.cycles, { from: ymd(new Date()) }];
          } else if ('cycleMode' in p && p.cycleMode === false && open) {
            cycles = s.cycles.map((c, i) =>
              i === s.cycles.length - 1 ? { ...c, to: ymd(new Date()) } : c,
            );
          }
          return { ...s, settings, cycles };
        }),
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
      repairDay: (date, prayer) =>
        setState((s) => {
          const cur = s.history[date] ?? { kept: 0 };
          if (cur.rest || cur.kept >= 5) return s;
          // Naming a prayer is optional — the garden calls this with none,
          // raising the count without claiming to know which prayer it was
          // for. `'sunrise'` is excluded even though it is a `PrayerId`: it
          // marks the end of the Fajr window, not a prayer anyone can repair.
          const next: DayRecord = { ...cur, kept: cur.kept + 1, updatedAt: Date.now() };
          if (prayer && FIVE.includes(prayer) && !cur.prayers?.includes(prayer)) {
            next.prayers = [...(cur.prayers ?? []), prayer];
          }
          return { ...s, history: { ...s.history, [date]: next } };
        }),
      addFocusMinutes: (n) =>
        setState((s) => {
          // A session that ends early, or a duration derived from a clock
          // jump, must never subtract from minutes already banked — only a
          // finite, positive amount is added; anything else adds nothing.
          const add = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
          const today = ymd(new Date());
          return {
            ...s,
            focusMinutes: s.focusMinutes + add,
            // A second session the same day adds to today's bucket rather
            // than replacing it — the chart would otherwise understate a day
            // with more than one completed session.
            focusByDay: { ...s.focusByDay, [today]: (s.focusByDay[today] ?? 0) + add },
          };
        }),
      toggleBlockedApp: (pkg) =>
        setState((s) => ({
          ...s,
          blockedApps: s.blockedApps.includes(pkg)
            ? s.blockedApps.filter((p) => p !== pkg)
            : [...s.blockedApps, pkg],
        })),
      applyRemoteHistory: (remoteHistory) =>
        setState((s) => {
          const history = { ...remoteHistory };
          delete history[ymd(new Date())];
          return { ...s, history };
        }),
      finishOnboarding: () => setState((s) => ({ ...s, onboarded: true })),
      // Wipes real history rather than replacing it with invented days.
      // `startedAt` is set to today because a fresh start has no past in
      // this app to judge — the same honest rule a first install gets.
      //
      // `cycles` needs its own explicit delete: the state reset alone would
      // leave the write effect to overwrite the Keystore entry with `"[]"`
      // on the next render, which happens to contain no dates either way,
      // but a user wiping her data should not have to trust a side effect
      // of unrelated timing for her periods to actually leave the device.
      reset: () => {
        setState({ ...DEFAULTS, startedAt: ymd(new Date()) });
        if (secureAvailable.current) {
          SecureStore.deleteItemAsync(CYCLES_KEY).catch(() => {});
        }
      },
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
