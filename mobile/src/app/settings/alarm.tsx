import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import {
  canScheduleExact,
  canUseFullScreenIntent,
  isIgnoringBatteryOptimizations,
  nextFajrAlarmAt,
  requestExactAlarmPermission,
  requestFullScreenIntentPermission,
  requestIgnoreBatteryOptimizations,
  scheduleTestAlarm,
} from '../../../modules/app-watch';
import { Bar, Button, Label, List, Note, Row, Screen, Toggle } from '../../components/ui';
import { notificationsGranted, requestNotificationPermission } from '../../data/notify';
import { dayMonth, hhmm, timesFor } from '../../data/prayer';
import { useStore } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

const OBJECTS = [
  { key: 'mat', icon: 'mat', title: 'Joynamozni skanerlash', sub: 'Karavotdan turishni talab qiladi' },
  { key: 'sink', icon: 'tap', title: 'Rakovinani skanerlash', sub: 'Hammomga borish kerak' },
  { key: 'both', icon: 'mat_tap', title: 'Ikkalasi ham', sub: 'Qaysinisi yaqin bo\'lsa' },
] as const;

/** How long "Signalni sinab ko'rish" waits before actually ringing -- long
 * enough to lock the phone and watch the lock screen, short enough that
 * nobody has to stand around for a minute's worth of nothing. */
const TEST_DELAY_MS = 60_000;

/** Read exactly once at mount, synchronously, like `focus/apps.tsx`'s
 * `readSnapshot` -- these are all cheap native reads, so there is no reason
 * to pay for a loading flash before the real state shows up. */
function readPermissionSnapshot() {
  return {
    exactAllowed: canScheduleExact(),
    batteryIgnored: isIgnoringBatteryOptimizations(),
    fullScreenIntentAllowed: canUseFullScreenIntent(),
    nextAt: nextFajrAlarmAt() as number | null,
  };
}

export default function AlarmSettings() {
  const { settings, patchSettings } = useStore();
  const fajr = timesFor(new Date(), settings.madhhab)[0];

  const [{ exactAllowed, batteryIgnored, fullScreenIntentAllowed, nextAt }, setSnapshot] =
    useState(readPermissionSnapshot);
  const [notifGranted, setNotifGranted] = useState(true);
  const [testArmedAt, setTestArmedAt] = useState<number | null>(null);
  const [testSecondsLeft, setTestSecondsLeft] = useState(0);

  // All three permissions here are granted from a system Settings screen
  // this component never sees return from directly -- the only moment it
  // can learn the answer changed is the next time it gains focus, same
  // reasoning (and the same `readSnapshot` shape) as `focus/apps.tsx`'s
  // usage/overlay permissions.
  useFocusEffect(
    useCallback(() => {
      setSnapshot(readPermissionSnapshot());
      notificationsGranted()
        .then(setNotifGranted)
        .catch(() => setNotifGranted(false));
    }, [setNotifGranted]),
  );

  // A plain ticking label, not a claim the test itself depends on -- the
  // alarm is armed by `scheduleTestAlarm` the instant the button is
  // pressed; this only re-renders the remaining seconds so the owner can
  // see it counting down before they lock the phone.
  useEffect(() => {
    if (testArmedAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((testArmedAt + TEST_DELAY_MS - Date.now()) / 1000));
      setTestSecondsLeft(left);
      if (left === 0) setTestArmedAt(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [testArmedAt]);

  const runTest = useCallback(() => {
    if (!canScheduleExact()) {
      requestExactAlarmPermission();
      return;
    }
    const at = Date.now() + TEST_DELAY_MS;
    scheduleTestAlarm(at);
    setTestArmedAt(Date.now());
  }, []);

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Bomdod uyg'otgichi" onBack={() => router.back()} />

      <View style={[s.hero, lift.high]}>
        <View style={s.flex}>
          <Text style={s.heroTime}>{hhmm(fajr.at)}</Text>
          <Text style={s.heroSub}>
            {settings.fajrAlarm && exactAllowed && nextAt
              ? `Keyingi signal: ${hhmm(new Date(nextAt))} · ${dayMonth(new Date(nextAt))}`
              : "Ertaga · Bomdod vaqtida"}
          </Text>
        </View>
        <Toggle
          value={settings.fajrAlarm}
          disabled={!exactAllowed}
          onChange={(v) => patchSettings({ fajrAlarm: v })}
        />
      </View>

      {!exactAllowed && (
        <>
          <Note icon="shield">Aniq vaqtda ishlashi uchun ruxsat kerak</Note>
          <Button
            label="Ruxsat berish"
            tone="ghost"
            onPress={requestExactAlarmPermission}
            style={s.permBtn}
          />
        </>
      )}

      {notifGranted === false && (
        <>
          <Note icon="shield">Bildirishnomalarga ruxsat kerak</Note>
          <Button
            label="Ruxsat berish"
            tone="ghost"
            onPress={async () => {
              const granted = await requestNotificationPermission();
              if (!granted) Linking.openSettings();
              setNotifGranted(await notificationsGranted());
            }}
            style={s.permBtn}
          />
        </>
      )}

      {!fullScreenIntentAllowed && (
        <View style={[s.fsiCard, lift.low]}>
          <Text style={s.fsiTitle}>To'liq ekranli ogohlantirish o'chirilgan</Text>
          <Text style={s.fsiBody}>Signal ekranni yoqishi uchun shu ruxsat kerak.</Text>
          <Button
            label="Ruxsat berish"
            tone="ghost"
            onPress={requestFullScreenIntentPermission}
            style={s.fsiBtn}
          />
        </View>
      )}

      {!batteryIgnored && (
        <>
          <Note icon="shield">Telefon ilovani uxlatib qo'yishi mumkin</Note>
          <Button
            label="Sozlamalarni ochish"
            tone="ghost"
            onPress={requestIgnoreBatteryOptimizations}
            style={s.permBtn}
          />
        </>
      )}

      <Label>Qanday o'chiriladi</Label>
      <List>
        {OBJECTS.map((o) => (
          <Row
            key={o.key}
            icon={o.icon}
            title={o.title}
            sub={o.sub}
            on={settings.scanObject === o.key}
            onPress={() => patchSettings({ scanObject: o.key })}
          />
        ))}
      </List>

      <Label>Ovoz</Label>
      <List>
        <Row icon="bell" title="Ohang" sub="Asta-sekin kuchayadi" value="Azon" chevron />
        <Row icon="tasbih" title="Tebranish" right={<Toggle value />} />
        <Row icon="clock" title="Takroriy signal" sub="5 daqiqada bir" right={<Toggle value />} />
      </List>

      <View style={s.foot}>
        {testArmedAt !== null ? (
          <Text style={s.testHint}>
            Signal {testSecondsLeft} soniyadan keyin chalinadi. Ekranni qulflab, kutib turing.
          </Text>
        ) : null}
        <Button label="Signalni sinab ko'rish" tone="ghost" onPress={runTest} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    marginTop: 4,
    marginHorizontal: layout.gutter,
    padding: 20,
    borderRadius: layout.radius.lg,
    backgroundColor: '#F3C87E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroTime: { fontFamily: font.black, fontSize: 40, letterSpacing: -1.5, color: '#40290C', fontVariant: ['tabular-nums'] },
  heroSub: { fontFamily: font.semibold, fontSize: size.tiny, color: '#8A5A11', marginTop: 2 },
  permBtn: { marginHorizontal: layout.gutter, marginTop: 8 },
  fsiCard: {
    marginHorizontal: layout.gutter,
    marginTop: 8,
    marginBottom: 14,
    padding: 16,
    borderRadius: layout.radius.md,
    backgroundColor: color.surface,
    gap: 8,
  },
  fsiTitle: { fontFamily: font.bold, fontSize: 15, color: color.ink },
  fsiBody: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: color.inkSoft },
  fsiBtn: { alignSelf: 'stretch', marginTop: 4 },
  foot: { marginTop: 18, marginHorizontal: layout.gutter, gap: 10 },
  testHint: {
    fontFamily: font.semibold,
    fontSize: size.tiny,
    color: '#8A5A11',
    textAlign: 'center',
  },
});
