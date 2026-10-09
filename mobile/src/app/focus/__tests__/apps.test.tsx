import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { create, act } from 'react-test-renderer';

import { hasOverlayPermission, hasUsageAccess, startFocus } from '../../../../modules/app-watch';
import { Row, Toggle } from '../../../components/ui';
import { useStore } from '../../../data/store';
import AppPicker from '../apps';

/**
 * task 20 fix round 1: the screen used to read `hasUsageAccess()` once at
 * mount and still render an operable switch regardless -- these tests pin
 * down the fix, that a missing permission makes the switch impossible to
 * use rather than silently useless.
 */

jest.mock('../../../../modules/app-watch', () => ({
  hasUsageAccess: jest.fn(),
  hasOverlayPermission: jest.fn(),
  installedApps: jest.fn(() => []),
  usageToday: jest.fn(() => []),
  appIcon: jest.fn(() => null),
  isFocusRunning: jest.fn(() => false),
  startFocus: jest.fn(),
  stopFocus: jest.fn(),
  requestUsageAccess: jest.fn(),
  requestOverlayPermission: jest.fn(),
}));

jest.mock('../../../data/store', () => ({
  useStore: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  // The real hook re-runs its effect on every navigation focus; a plain
  // `useEffect` that runs once on mount is enough to exercise the
  // permission re-check these tests care about without pulling in a real
  // navigator. `require` here, not the top-level import, because a jest
  // mock factory may not close over out-of-scope variables.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, []),
}));

const mockUseStore = useStore as jest.Mock;
const mockHasUsageAccess = hasUsageAccess as jest.Mock;
const mockHasOverlayPermission = hasOverlayPermission as jest.Mock;

const mockStartFocus = startFocus as jest.Mock;
const mockPatchSettings = jest.fn();

beforeEach(() => {
  mockPatchSettings.mockClear();
  mockUseStore.mockReturnValue({
    settings: { testBlockNow: false, blockMode: 'remind' },
    patchSettings: mockPatchSettings,
    blockedApps: [],
    toggleBlockedApp: jest.fn(),
  });
});

/** `Screen` reads safe-area insets unconditionally -- a plain render with no
 * provider throws before any of this test's assertions get a chance to. */
function renderScreen() {
  return create(
    React.createElement(
      SafeAreaProvider,
      {
        initialMetrics: {
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
          frame: { x: 0, y: 0, width: 390, height: 844 },
        },
      },
      React.createElement(AppPicker),
    ),
  );
}

describe('AppPicker permission gating', () => {
  it('shows the usage-access card and disables the switch when usage access is missing', async () => {
    mockHasUsageAccess.mockReturnValue(false);
    mockHasOverlayPermission.mockReturnValue(true);

    let root!: ReturnType<typeof create>;
    await act(async () => {
      root = renderScreen();
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain("Foydalanish ruxsati yo'q");
    expect(json).toContain('Qaysi ilova ochilganini bilish uchun shu ruxsat kerak.');
    // The hint about Restricted Settings belongs on screen whenever either
    // card does, not only for usage access.
    expect(json).toContain('Cheklangan sozlamalarga ruxsat berish');

    const testSwitch = root.root.findAllByType(Toggle)[0];
    expect(testSwitch.props.disabled).toBe(true);
  });

  it('shows the overlay card (not the usage-access one) when only overlay is missing', async () => {
    mockHasUsageAccess.mockReturnValue(true);
    mockHasOverlayPermission.mockReturnValue(false);

    let root!: ReturnType<typeof create>;
    await act(async () => {
      root = renderScreen();
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain("Ustidan ko'rsatish ruxsati yo'q");
    expect(json).not.toContain("Foydalanish ruxsati yo'q");

    const testSwitch = root.root.findAllByType(Toggle)[0];
    expect(testSwitch.props.disabled).toBe(true);
  });

  it('enables the switch and hides every permission card once both are granted', async () => {
    mockHasUsageAccess.mockReturnValue(true);
    mockHasOverlayPermission.mockReturnValue(true);

    let root!: ReturnType<typeof create>;
    await act(async () => {
      root = renderScreen();
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).not.toContain("Foydalanish ruxsati yo'q");
    expect(json).not.toContain("Ustidan ko'rsatish ruxsati yo'q");

    const testSwitch = root.root.findAllByType(Toggle)[0];
    expect(testSwitch.props.disabled).toBe(false);
  });
});

/**
 * Task 23: the mode choice under the test switch. These pin down that the
 * choice is real -- it is what `startFocus` actually receives, not just a
 * label that changes on screen -- which is the one way this control could
 * silently stop mattering without a test noticing.
 */
describe('AppPicker mode choice', () => {
  beforeEach(() => {
    mockHasUsageAccess.mockReturnValue(true);
    mockHasOverlayPermission.mockReturnValue(true);
  });

  it('shows both modes with their Uzbek copy', async () => {
    let root!: ReturnType<typeof create>;
    await act(async () => {
      root = renderScreen();
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('Eslatma');
    expect(json).toContain("Ogohlantiradi, lekin ilovani ochishga ruxsat beradi");
    expect(json).toContain('Qulf');
    expect(json).toContain('Ilovani umuman ochtirmaydi');
  });

  it('defaults to remind being selected', async () => {
    let root!: ReturnType<typeof create>;
    await act(async () => {
      root = renderScreen();
    });

    const rows = root.root.findAllByType(Row);
    const remindRow = rows.find((r) => r.props.title === 'Eslatma')!;
    const lockRow = rows.find((r) => r.props.title === 'Qulf')!;
    expect(remindRow.props.on).toBe(true);
    expect(lockRow.props.on).toBe(false);
  });

  it('starts the test session in lock mode once Qulf is chosen', async () => {
    let root!: ReturnType<typeof create>;
    await act(async () => {
      root = renderScreen();
    });

    // Picking "Qulf" patches the store -- the same store the test switch
    // itself reads `blockMode` from, so a re-render with the patched value
    // is what the real app would show after this tap.
    const lockRow = root.root.findAllByType(Row).find((r) => r.props.title === 'Qulf')!;
    await act(async () => {
      lockRow.props.onPress();
    });
    expect(mockPatchSettings).toHaveBeenCalledWith({ blockMode: 'lock' });

    mockUseStore.mockReturnValue({
      settings: { testBlockNow: false, blockMode: 'lock' },
      patchSettings: mockPatchSettings,
      blockedApps: ['com.instagram.android'],
      toggleBlockedApp: jest.fn(),
    });
    await act(async () => {
      root = renderScreen();
    });

    const testSwitch = root.root.findAllByType(Toggle)[0];
    await act(async () => {
      testSwitch.props.onChange(true);
    });

    expect(mockStartFocus).toHaveBeenCalledWith(
      ['com.instagram.android'],
      Number.MAX_SAFE_INTEGER,
      'lock',
    );
  });
});
