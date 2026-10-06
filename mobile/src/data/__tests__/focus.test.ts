import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { act, create } from 'react-test-renderer';

import { StoreProvider, useStore } from '../store';

type Store = ReturnType<typeof useStore>;

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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

describe('addFocusMinutes', () => {
  it('starts a fresh install at zero', async () => {
    const store = await mountStore();
    expect(store.current().focusMinutes).toBe(0);
  });

  it('banks a completed session and ignores a negative one', async () => {
    const store = await mountStore();

    await act(async () => {
      store.current().addFocusMinutes(12);
    });
    expect(store.current().focusMinutes).toBe(12);

    // A miscomputed duration (e.g. a clock correction mid-session) must
    // never drain minutes a genuinely completed session already banked.
    await act(async () => {
      store.current().addFocusMinutes(-5);
    });
    expect(store.current().focusMinutes).toBe(12);
  });

  it('floors a fractional duration rather than banking a partial minute as whole', async () => {
    const store = await mountStore();

    await act(async () => {
      store.current().addFocusMinutes(4.9);
    });
    expect(store.current().focusMinutes).toBe(4);
  });

  it('persists the total across a fresh mount', async () => {
    const store = await mountStore();

    await act(async () => {
      store.current().addFocusMinutes(7);
    });

    const reloaded = await mountStore();
    expect(reloaded.current().focusMinutes).toBe(7);
  });
});
