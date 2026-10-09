import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hasUsageAccess, installedApps, requestUsageAccess, usageToday } from '../../../modules/app-watch';
import { Bar, Empty, Label, List, Row, Screen } from '../../components/ui';
import { hasAnyFocus, lastSevenDays } from '../../data/focusWeek';
import { WEEKDAYS_UZ } from '../../data/prayer';
import { useStore } from '../../data/store';
import { color, font, layout, lift } from '../../design/tokens';

/** Today's five most-used apps, labelled from the OS and sorted by minutes
 * descending -- a top-five cut because the row this feeds is a glance, not
 * a full report, and `usageToday()` can legitimately return every app on
 * the device. */
function topUsage(apps: { pkg: string; label: string }[], usage: { pkg: string; minutes: number }[]) {
  const labelFor = new Map(apps.map((a) => [a.pkg, a.label]));
  return usage
    .filter((u) => labelFor.has(u.pkg))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5)
    .map((u) => ({ pkg: u.pkg, label: labelFor.get(u.pkg)!, minutes: u.minutes }));
}

/** Single-letter weekday label, two letters only for "shanba" — it and
 * "seshanba" are the only pair that would otherwise collide on their first
 * letter. Derived from `WEEKDAYS_UZ` rather than a parallel hardcoded table,
 * so there is one source of truth for the names. */
function dayAbbr(d: Date): string {
  const name = WEEKDAYS_UZ[d.getDay()]!;
  return name.startsWith('sh') ? 'Sh' : name[0]!.toUpperCase();
}

export default function FocusStats() {
  const { focusMinutes, focusByDay } = useStore();
  const h = Math.floor(focusMinutes / 60);
  const m = focusMinutes % 60;

  const today = new Date();
  const week = lastSevenDays(focusByDay, today);
  // A week of real zeroes is still a week to chart; the only thing that
  // disqualifies the chart is never having run a session at all.
  const neverFocused = !hasAnyFocus(focusByDay);
  const max = Math.max(1, ...week.map((w) => w.minutes));

  // This was the empty state task 21 points at: there was no way to list
  // real per-app usage before the native module existed to read it. Read
  // once, synchronously, in the lazy initializer -- a native call this
  // cheap does not need an effect and a loading flash to get its answer.
  const [{ usageGranted, usage }] = useState(() => {
    const has = hasUsageAccess();
    return { usageGranted: has, usage: has ? topUsage(installedApps(), usageToday()) : [] };
  });

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Fokus natijalari" onBack={() => router.back()} />

      <View style={[s.hero, lift.high]}>
        <Text style={s.heroKey}>JAMI HIMOYALANGAN</Text>
        <Text style={s.heroNum}>
          {h}s {m}d
        </Text>
      </View>

      <Label>Kunlik fokus vaqti</Label>
      {neverFocused ? (
        <Empty
          icon="chart"
          title="Hali fokus seansi yo'q"
          body="Birinchi seansni boshlang — natijalar shu yerda ko'rinadi."
        />
      ) : (
        <View style={[s.chart, lift.low]}>
          {week.map((w, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (6 - i));
            return (
              <View key={w.date} style={s.col}>
                <View style={[s.bar, { height: Math.max(6, (w.minutes / max) * 92) }]} />
                <Text style={s.day}>{dayAbbr(d)}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Label>Ilovalar bo'yicha bugungi vaqt</Label>
      {!usageGranted ? (
        <Empty
          icon="apps"
          title="Ruxsat berilmagan"
          body="Qaysi ilovada qancha vaqt o'tkazilganini ko'rish uchun tizim ruxsati kerak."
          action="Ruxsat berish"
          onAction={requestUsageAccess}
        />
      ) : usage.length === 0 ? (
        <Empty
          icon="apps"
          title="Bugun hali ma'lumot yo'q"
          body="Ilovalardan foydalanilgach, bu yerda ko'rinadi."
        />
      ) : (
        <List>
          {usage.map((u) => (
            <Row key={u.pkg} title={u.label} value={`${u.minutes}d`} />
          ))}
        </List>
      )}

      <Label>To'xtatilgan urinishlar</Label>
      <Empty
        icon="apps"
        title="Hali ma'lumot yo'q"
        body="Ilovalarni bloklash yoqilgandan keyin bu yerda ko'rinadi."
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: {
    marginTop: 4,
    marginHorizontal: layout.gutter,
    padding: 20,
    borderRadius: layout.radius.lg,
    backgroundColor: '#F3C87E',
  },
  heroKey: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: '#8A5A11' },
  heroNum: { marginTop: 4, fontFamily: font.black, fontSize: 42, letterSpacing: -1.5, color: '#40290C' },
  chart: {
    marginHorizontal: layout.gutter,
    padding: 18,
    borderRadius: 22,
    backgroundColor: color.surface,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 150,
  },
  col: { flex: 1, alignItems: 'center', gap: 8 },
  bar: { alignSelf: 'stretch', borderRadius: 8, backgroundColor: '#E8B762' },
  day: { fontFamily: font.semibold, fontSize: 10.5, color: color.inkSoft },
});
