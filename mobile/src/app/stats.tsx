import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Bars, Empty, Label, Ring, Screen, Segment, Tiles } from '../components/ui';
import { MONTHS_UZ } from '../data/prayer';
import { consistency, monthTotals } from '../data/stats';
import { useStore } from '../data/store';
import { font, layout, lift, size } from '../design/tokens';

export default function Stats() {
  const [range, setRange] = useState(1);
  const { history, startedAt, streak, recentDays } = useStore();

  // Today lives in `marks`, not yet in `history` (it only moves there at
  // roll-over), so it has to be merged in by hand or every screen loses its
  // own day until midnight.
  const today = recentDays(1)[0]!;
  const historyWithToday = useMemo(
    () => ({ ...history, [today.date]: today.rec }),
    [history, today],
  );

  const now = new Date();
  const { prayed, total } = monthTotals(historyWithToday, now, startedAt);
  const pct = total > 0 ? Math.round((prayed / total) * 100) : 0;

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  // A day before `startedAt` is a day the app wasn't installed, not a day of
  // zeroes the user earned — clip the range so it never shows up as a
  // fabricated-looking run of missed prayers.
  const start = startedAt ? new Date(`${startedAt}T00:00:00`) : weekAgo;
  const from = start > weekAgo ? start : weekAgo;
  const bars = consistency(historyWithToday, from, now);

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Statistika" onBack={() => router.back()} />
      <Segment options={['Hafta', 'Oy', 'Yil']} index={range} onChange={setRange} />

      <View style={[s.ring, lift.high]}>
        <View>
          <Ring pct={pct} />
          <Text style={s.ringPct}>{pct}%</Text>
        </View>
        <View style={s.flex}>
          <Text style={s.ringTitle}>{MONTHS_UZ[now.getMonth()]} muntazamligi</Text>
          <Text style={s.ringSub}>
            {prayed} / {total} namoz
          </Text>
        </View>
      </View>

      <Label>Oxirgi kunlar</Label>
      {Object.keys(history).length === 0 && !today.rec.kept ? (
        <Empty
          icon="calendar"
          title="Hali ma'lumot yo'q"
          body="Hali ma'lumot yo'q — birinchi namozingizni belgilang."
        />
      ) : (
        <Bars items={bars} />
      )}

      <View style={s.gap} />
      <Tiles items={[{ value: String(streak), label: 'kunlik Bomdod' }]} />
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  gap: { height: 14 },
  ring: {
    marginTop: 14,
    marginHorizontal: layout.gutter,
    padding: 20,
    borderRadius: layout.radius.lg,
    backgroundColor: '#F3C87E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringPct: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 36,
    textAlign: 'center',
    fontFamily: font.extrabold,
    fontSize: 21,
    color: '#40290C',
  },
  ringTitle: { fontFamily: font.extrabold, fontSize: size.body, color: '#40290C' },
  ringSub: { fontFamily: font.semibold, fontSize: 12.5, color: '#8A5A11', marginTop: 3 },
});
