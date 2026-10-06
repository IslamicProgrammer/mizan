import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { act, create } from 'react-test-renderer';

import { StoreProvider, stateForSync, useStore } from '../store';

type Store = ReturnType<typeof useStore>;

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mirrors the private `KEY` in store.tsx — there is no exported way to seed
// a saved state ahead of hydration, so the tests write the same storage key
// the module reads on mount.
const STORAGE_KEY = 'mizan.state.v1';

afterEach(async () => {
  await AsyncStorage.clear();
  jest.useRealTimers();
});

/** Exposes the live store value out of React so assertions can read it. */
function Probe({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

async function mountStore(): Promise<{ current: () => Store }> {
  let latest: Store | null = null;
  await act(async () => {
    create(
      React.createElement(
        StoreProvider,
        null,
        React.createElement(Probe, { onReady: (s) => { latest = s; } }),
      ),
    );
    // Hydration resolves on a real microtask (AsyncStorage.getItem), so one
    // flush is not enough to also pick up the render it triggers.
    await Promise.resolve();
    await Promise.resolve();
  });
  if (!latest) throw new Error('store never hydrated');
  return { current: () => latest! };
}

describe('setMark stamps updatedAt', () => {
  it('lets an unmark land a newer updatedAt than the original mark', async () => {
    const store = await mountStore();

    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    await act(async () => {
      store.current().setMark('fajr', 'done');
    });
    const firstStamp = store.current().recentDays(1)[0]!.rec.updatedAt;
    expect(firstStamp).toBe(1_000);

    jest.spyOn(Date, 'now').mockReturnValue(2_000);
    await act(async () => {
      store.current().setMark('fajr', null);
    });
    const secondStamp = store.current().recentDays(1)[0]!.rec.updatedAt;

    expect(secondStamp).toBe(2_000);
    expect(secondStamp).toBeGreaterThan(firstStamp as number);

    jest.restoreAllMocks();
  });
});

describe('rollOver', () => {
  it('carries the last edit time forward rather than stamping the moment it runs', async () => {
    jest.useFakeTimers();
    // "Now" is well after the real edit happened - the bug this guards
    // against is roll-over claiming the edit happened now instead.
    jest.setSystemTime(new Date('2026-10-02T12:00:00.000Z'));
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        marksDate: '2026-10-01',
        marks: { fajr: 'done', sunrise: null, dhuhr: null, asr: null, maghrib: null, isha: null },
        marksUpdatedAt: 5_000,
      }),
    );

    const store = await mountStore();

    // Roll-over ran during hydrate, because the saved day is not today, and
    // it must carry 5_000 forward rather than stamping "now".
    expect(store.current().history['2026-10-01']).toEqual({ kept: 1, updatedAt: 5_000 });
  });

  it('falls back to now when marksUpdatedAt is absent', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-02T12:00:00.000Z'));
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        marksDate: '2026-10-01',
        marks: { fajr: 'done', sunrise: null, dhuhr: null, asr: null, maghrib: null, isha: null },
      }),
    );

    const store = await mountStore();

    expect(store.current().history['2026-10-01']).toEqual({ kept: 1, updatedAt: Date.now() });
  });
});

describe('repairDay', () => {
  it('stamps, and raises kept, on the repaired day', async () => {
    const store = await mountStore();

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T09:00:00.000Z'));

    await act(async () => {
      store.current().repairDay('2026-09-01');
    });

    expect(store.current().history['2026-09-01']).toEqual({ kept: 1, updatedAt: Date.now() });
  });
});

describe('setQaza', () => {
  it('persists an outstanding count across a fresh mount, not just in memory', async () => {
    const store = await mountStore();

    await act(async () => {
      store.current().setQaza('fajr', 3);
    });
    expect(store.current().qaza.fajr).toBe(3);

    // A real navigation never unmounts the provider, but a fresh mount is
    // the sharper check: it proves the count reached AsyncStorage, not just
    // that it survived in the live object.
    const reloaded = await mountStore();
    expect(reloaded.current().qaza.fajr).toBe(3);
  });

  it('clamps at zero — a negative count of owed prayers is meaningless', async () => {
    const store = await mountStore();

    await act(async () => {
      store.current().setQaza('asr', -5);
    });

    expect(store.current().qaza.asr).toBe(0);
  });
});

describe('cycle mode', () => {
  it('appends an open cycle when cycleMode flips on', async () => {
    const store = await mountStore();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T09:00:00.000Z'));

    await act(async () => {
      store.current().patchSettings({ cycleMode: true });
    });

    expect(store.current().cycles).toEqual([{ from: '2026-10-05' }]);
  });

  it('closes the same open cycle when cycleMode flips off, rather than opening a new one', async () => {
    const store = await mountStore();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T09:00:00.000Z'));
    await act(async () => {
      store.current().patchSettings({ cycleMode: true });
    });

    jest.setSystemTime(new Date('2026-10-08T09:00:00.000Z'));
    await act(async () => {
      store.current().patchSettings({ cycleMode: false });
    });

    expect(store.current().cycles).toEqual([{ from: '2026-10-05', to: '2026-10-08' }]);
  });

  it('does not append a second open cycle when flipped on twice', async () => {
    const store = await mountStore();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T09:00:00.000Z'));

    await act(async () => {
      store.current().patchSettings({ cycleMode: true });
    });
    await act(async () => {
      store.current().patchSettings({ cycleMode: true });
    });

    expect(store.current().cycles).toHaveLength(1);
  });

  it('a second on/off round starts a new, separate cycle', async () => {
    const store = await mountStore();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-01T09:00:00.000Z'));
    await act(async () => {
      store.current().patchSettings({ cycleMode: true });
    });
    jest.setSystemTime(new Date('2026-09-04T09:00:00.000Z'));
    await act(async () => {
      store.current().patchSettings({ cycleMode: false });
    });

    jest.setSystemTime(new Date('2026-10-02T09:00:00.000Z'));
    await act(async () => {
      store.current().patchSettings({ cycleMode: true });
    });

    expect(store.current().cycles).toEqual([
      { from: '2026-09-01', to: '2026-09-04' },
      { from: '2026-10-02' },
    ]);
  });
});

describe('stateForSync', () => {
  it('drops cycles from the object Task 8 will send to the server', async () => {
    const store = await mountStore();
    await act(async () => {
      store.current().patchSettings({ cycleMode: true });
    });

    const payload = stateForSync(store.current());

    expect('cycles' in payload).toBe(false);
    // Everything else still rides along — only the one health-data field is cut.
    expect(payload.settings.cycleMode).toBe(true);
  });
});

describe("recordFor's today branch", () => {
  it('carries no updatedAt key when marksUpdatedAt has never been set', async () => {
    const store = await mountStore();

    const todayRecord = store.current().recentDays(1)[0]!.rec;

    expect(todayRecord).toEqual({ kept: 0 });
    expect(todayRecord.updatedAt).toBeUndefined();
  });

  it('marks the live today as a rest day under cycle mode, not just at roll-over', async () => {
    const store = await mountStore();

    await act(async () => {
      store.current().patchSettings({ cycleMode: true });
    });

    expect(store.current().recentDays(1)[0]!.rec.rest).toBe(true);
  });
});
