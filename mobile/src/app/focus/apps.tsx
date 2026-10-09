import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  appIcon,
  hasOverlayPermission,
  hasUsageAccess,
  installedApps,
  isFocusRunning,
  requestOverlayPermission,
  requestUsageAccess,
  startFocus,
  stopFocus,
  usageToday,
  type InstalledApp,
} from '../../../modules/app-watch';
import { Button, Bar, Empty, Label, List, Note, Row, Screen, Toggle } from '../../components/ui';
import { useStore } from '../../data/store';
import { color, font, layout, lift } from '../../design/tokens';

/**
 * The real app list (task 21). Icons and labels are never cached alongside
 * the chosen package names in the store -- they are re-read from the OS
 * every time this screen renders, through `AppRow` below, so a locale
 * change or an app update can never leave a stale label or a dead icon on
 * screen.
 *
 * Which apps to block is a choice the user can make with neither permission
 * granted yet -- `installedApps` needs none of them -- so the list below is
 * never hidden behind a permission gate the way an earlier version hid the
 * whole screen. Only `usageToday`'s per-row minutes, and the `Sinov rejimi`
 * switch that actually starts the service, wait on them.
 */
type Snapshot = {
  usageGranted: boolean;
  overlayGranted: boolean;
  apps: InstalledApp[];
  usage: Record<string, number>;
};

/** Reads the OS exactly once per call -- used both for the initial render
 * and for every focus of this screen (task 20 fix round 1: a value read
 * once at mount is stale exactly when it matters, since both permissions
 * are granted from a system Settings screen this component never sees
 * return from directly). */
function readSnapshot(): Snapshot {
  const usageGranted = hasUsageAccess();
  const overlayGranted = hasOverlayPermission();
  const apps = installedApps();
  const usage: Record<string, number> = {};
  if (usageGranted) {
    for (const u of usageToday()) usage[u.pkg] = u.minutes;
  }
  return { usageGranted, overlayGranted, apps, usage };
}

export default function AppPicker() {
  const { settings, patchSettings, blockedApps, toggleBlockedApp } = useStore();
  // Computed once, synchronously, for the first render -- a native read
  // this cheap belongs in the lazy initializer, not behind a loading flash
  // caused by fetching it again inside an effect.
  const [{ usageGranted, overlayGranted, apps, usage }, setSnapshot] = useState(readSnapshot);

  useFocusEffect(
    useCallback(() => {
      setSnapshot(readSnapshot());
      // A test switch that reads "on" after the process restarted (a device
      // reboot, the app killed from recents) but has no service actually
      // running behind it is exactly the "permanent background service the
      // user cannot account for" task 21 warns against. Correcting it to
      // "off" here -- never restarting the service to match a stale flag --
      // is a one-time reconciliation against the native service's real
      // state, run on every return to this screen rather than only at
      // mount, for the same reason the permission re-check above is.
      if (settings.testBlockNow && !isFocusRunning()) {
        patchSettings({ testBlockNow: false });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.testBlockNow]),
  );

  // Usage access first: without it there is no foreground app to detect at
  // all, so there is nothing the overlay/background-launch permission could
  // do yet either. Fixing one card at a time, in the order that actually
  // unblocks the feature, beats listing both at once.
  const missingPermission: 'usage' | 'overlay' | null = !usageGranted
    ? 'usage'
    : !overlayGranted
      ? 'overlay'
      : null;

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

      {missingPermission ? (
        <>
          <PermissionCard
            title={
              missingPermission === 'usage'
                ? "Foydalanish ruxsati yo'q"
                : "Ustidan ko'rsatish ruxsati yo'q"
            }
            body={
              missingPermission === 'usage'
                ? 'Qaysi ilova ochilganini bilish uchun shu ruxsat kerak.'
                : "Eslatmani boshqa ilova ustida ko'rsatish uchun kerak."
            }
            action="Ruxsat berish"
            onAction={missingPermission === 'usage' ? requestUsageAccess : requestOverlayPermission}
          />
          <Note>
            {"Agar sozlamada tugma o'chiq bo'lsa: Ilovalar → Mizan → ⋮ → Cheklangan sozlamalarga ruxsat berish."}
          </Note>
        </>
      ) : null}

      <List>
        <Row
          title="Sinov rejimi"
          sub="Tanlangan ilovalar darhol bloklanadi — fokus seansini kutmasdan"
          right={
            <Toggle
              value={settings.testBlockNow}
              onChange={onToggleTestMode}
              disabled={!!missingPermission}
            />
          }
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
    </Screen>
  );
}

/** The card above the `Sinov rejimi` row while a permission it needs is
 * missing -- which permission, in plain Uzbek, and the one button that
 * opens the right Settings screen for it. */
function PermissionCard({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <View style={[s.permCard, lift.low]}>
      <Text style={s.permTitle}>{title}</Text>
      <Text style={s.permBody}>{body}</Text>
      <Button label={action} tone="ghost" onPress={onAction} style={s.permBtn} />
    </View>
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

  permCard: {
    marginHorizontal: layout.gutter,
    marginBottom: 14,
    padding: 16,
    borderRadius: layout.radius.md,
    backgroundColor: color.surface,
    gap: 8,
  },
  permTitle: { fontFamily: font.bold, fontSize: 15, color: color.ink },
  permBody: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: color.inkSoft },
  permBtn: { alignSelf: 'stretch', marginTop: 4 },
});
