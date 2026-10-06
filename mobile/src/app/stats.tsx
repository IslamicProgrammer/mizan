import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Bars, Empty, Label, Ring, Screen, Segment, Tiles } from '../components/ui';
import { FIVE, MONTHS_UZ, timesFor } from '../data/prayer';
import { consistency, monthTotals } from '../data/stats';
import { useStore } from '../data/store';
import { font, layout, lift, size } from '../design/tokens';

export default function Stats() {
  const [range, setRange] = useState(1);
  const { history, startedAt, streak, recentDays, settings } = useStore();

  // Today lives in `marks`, not yet in `history` (it only moves there at
  // roll-over), so it has to be merged in by hand or every screen loses its
  // own day until midnight.
  const today = recentDays(1)[0]!;
  const historyWithToday = useMemo(
    () => ({ ...history, [today.date]: today.rec }),
    [history, today],
  );

  const now = new Date();
  // Today cannot owe a prayer whose time hasn't come round yet — only the
  // slots already passed count toward the day's quota, which is what keeps
  // a perfect day one from reading as 50% at 6am on day two.
  const owedToday = timesFor(now, settings.madhhab).filter(
    (s) => FIVE.includes(s.id) && s.at <= now,
  ).length;
  const { prayed, total } = monthTotals(historyWithToday, now, startedAt, owedToday);
  const pct = total > 0 ? Math.round((prayed / total) * 100) : 0;

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  // `consistency` itself clips anything before `startedAt` and anything
  // after today, so the window below is just "the last 7 days" — it doesn't
  // need to know the install date to avoid showing a fabricated-looking run
  // of missed prayers.
  const bars = consistency(historyWithToday, weekAgo, now, startedAt);

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
      {/* `Object.keys(history).length === 0` misses a history made only of
          rest days — it is non-empty but still produces no bar. Guarding on
          whether `consistency` actually produced anything is the condition
          that matches what this card renders. */}
      {bars.length === 0 ? (
        <Empty
          icon="calendar"
          title="Hali ma'lumot yo'q"
          body="Birinchi namozingizni belgilang."
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
