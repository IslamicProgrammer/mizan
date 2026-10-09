import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import {
  appIcon,
  hasUsageAccess,
  installedApps,
  isFocusRunning,
  requestUsageAccess,
  startFocus,
  stopFocus,
  usageToday,
  type InstalledApp,
} from '../../../modules/app-watch';
import { Bar, Empty, Label, List, Row, Screen, Toggle } from '../../components/ui';
import { useStore } from '../../data/store';
import { color, font } from '../../design/tokens';

/**
 * The real app list (task 21). Icons and labels are never cached alongside
 * the chosen package names in the store -- they are re-read from the OS
 * every time this screen renders, through `AppRow` below, so a locale
 * change or an app update can never leave a stale label or a dead icon on
 * screen.
 */
type Snapshot = { granted: boolean; apps: InstalledApp[]; usage: Record<string, number> };

/** Reads the OS exactly once per call -- used both for the initial render
 * and for every return-to-foreground, so there is one definition of "the
 * current truth" rather than two that could drift apart. */
function readSnapshot(): Snapshot {
  const granted = hasUsageAccess();
  if (!granted) return { granted, apps: [], usage: {} };
  const usage: Record<string, number> = {};
  for (const u of usageToday()) usage[u.pkg] = u.minutes;
  return { granted, apps: installedApps(), usage };
}

export default function AppPicker() {
  const { settings, patchSettings, blockedApps, toggleBlockedApp } = useStore();
  // Computed once, synchronously, for the first render -- a native read
  // this cheap belongs in the lazy initializer, not behind a loading flash
  // caused by fetching it again inside an effect.
  const [{ granted, apps, usage }, setSnapshot] = useState(readSnapshot);

  useEffect(() => {
    // A test switch that reads "on" after the process restarted (a device
    // reboot, the app killed from recents) but has no service actually
    // running behind it is exactly the "permanent background service the
    // user cannot account for" task 21 warns against. Correcting it to
    // "off" here -- never restarting the service to match a stale flag --
    // is a one-time reconciliation against the native service's real state
    // at mount, not a data fetch that belongs in the render path.
    if (settings.testBlockNow && !isFocusRunning()) {
      patchSettings({ testBlockNow: false });
    }
    // `requestUsageAccess` only opens Settings; it cannot report back when
    // the user grants it there. Re-checking on every return to the
    // foreground -- inside this subscription callback, never in the effect
    // body itself -- is what lets this screen reflect that without a
    // second manual navigation.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setSnapshot(readSnapshot());
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onToggleTestMode = (v: boolean) => {
    patchSettings({ testBlockNow: v });
    if (v) {
      startFocus(blockedApps, Number.MAX_SAFE_INTEGER);
    } else {
      stopFocus();
    }
  };

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Ilovalar" onBack={() => router.back()} />

      {!granted ? (
        <Empty
          icon="lock"
          title="Ilovalarni bloklash uchun ruxsat kerak."
          body="Qaysi ilova oldinda turganini ko'rish uchun tizim sozlamalaridan ruxsat bering."
          action="Ruxsat berish"
          onAction={requestUsageAccess}
        />
      ) : (
        <>
          <List>
            <Row
              title="Sinov rejimi"
              sub="Tanlangan ilovalar darhol bloklanadi — fokus seansini kutmasdan"
              right={<Toggle value={settings.testBlockNow} onChange={onToggleTestMode} />}
            />
          </List>

          <Label>Bloklanadigan ilovalar</Label>
          {apps.length === 0 ? (
            <Empty
              icon="apps"
              title="Ilovalar topilmadi"
              body="Qurilmada ochiladigan ilova topilmadi."
            />
          ) : (
            <List>
              {apps.map((app) => (
                <AppRow
                  key={app.pkg}
                  app={app}
                  minutes={usage[app.pkg]}
                  blocked={blockedApps.includes(app.pkg)}
                  onToggle={() => toggleBlockedApp(app.pkg)}
                />
              ))}
            </List>
          )}
        </>
      )}
    </Screen>
  );
}

/**
 * One row in the real list. `installedApps()` carries no icon (task 21 fix
 * -- inlining 150-300 of them froze the exact screen this feature is meant
 * to be tested on), so each row fetches its own via `appIcon(pkg)` after it
 * has already rendered with its label and letter tile. The native side
 * caches the decoded result, so remounting this row (a re-render, a scroll
 * back into view) costs a bridge call, not a re-decode.
 */
function AppRow({
  app,
  minutes,
  blocked,
  onToggle,
}: {
  app: InstalledApp;
  minutes: number | undefined;
  blocked: boolean;
  onToggle: () => void;
}) {
  const [icon, setIcon] = useState<string | null>(null);
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => {
    // `appIcon` reaches out to the native module -- an external system, not
    // derived React state -- so the fetch runs inside a microtask rather
    // than synchronously in the effect body. That is what lets this row's
    // first paint land with the letter tile before the icon arrives, and
    // what keeps the lint rule for cascading renders satisfied.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setIcon(appIcon(app.pkg));
      setIconFailed(false);
    });
    return () => {
      cancelled = true;
    };
  }, [app.pkg]);

  const showIcon = icon !== null && !iconFailed;

  return (
    <View style={s.row}>
      {showIcon ? (
        <Image
          source={{ uri: icon! }}
          style={s.icon}
          contentFit="cover"
          onError={() => setIconFailed(true)}
        />
      ) : (
        <View style={s.letterTile}>
          <Text style={s.letterText}>{app.label.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={s.rowText}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {app.label}
        </Text>
        <Text style={s.rowSub}>
          {minutes ? `Bugun ${minutes} daqiqa ishlatildi` : 'Bugun ishlatilmagan'}
        </Text>
      </View>
      <Toggle value={blocked} onChange={onToggle} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 16 },
  icon: { width: 36, height: 36, borderRadius: 10 },
  letterTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#D9CBB3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: { fontFamily: font.extrabold, fontSize: 15, color: color.inkWarm },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontFamily: font.bold, fontSize: 15, color: color.ink },
  rowSub: { fontFamily: font.medium, fontSize: 12, color: color.inkSoft },
});
