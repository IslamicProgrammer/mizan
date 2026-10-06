import React from 'react';
import { act, create } from 'react-test-renderer';

import { StoreProvider, useStore } from '../store';

type Store = ReturnType<typeof useStore>;

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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
