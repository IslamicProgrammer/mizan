import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Empty, Label, Screen } from '../../components/ui';
import { hasAnyFocus, lastSevenDays } from '../../data/focusWeek';
import { WEEKDAYS_UZ } from '../../data/prayer';
import { useStore } from '../../data/store';
import { color, font, layout, lift } from '../../design/tokens';

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
