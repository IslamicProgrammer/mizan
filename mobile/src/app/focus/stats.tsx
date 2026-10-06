import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Label, List, Row, Screen } from '../../components/ui';
import { MOCK } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

const WEEK = [
  { d: 'D', v: 42 },
  { d: 'S', v: 61 },
  { d: 'C', v: 38 },
  { d: 'P', v: 74 },
  { d: 'J', v: 96 },
  { d: 'Sh', v: 55 },
  { d: 'Y', v: 30 },
];

export default function FocusStats() {
  const max = Math.max(...WEEK.map((w) => w.v));
  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Fokus natijalari" onBack={() => router.back()} />

      <View style={[s.hero, lift.high]}>
        <Text style={s.heroKey}>SHU OY HIMOYALANGAN</Text>
        <Text style={s.heroNum}>
          {Math.floor(MOCK.focusMinutes / 60)}s {MOCK.focusMinutes % 60}d
        </Text>
        <Text style={s.heroSub}>sentabrdan 2s 10d ko'proq</Text>
      </View>

      <Label>Kunlik fokus vaqti</Label>
      <View style={[s.chart, lift.low]}>
        {WEEK.map((w) => (
          <View key={w.d} style={s.col}>
            <View style={[s.bar, { height: Math.max(6, (w.v / max) * 92) }]} />
            <Text style={s.day}>{w.d}</Text>
          </View>
        ))}
      </View>

      <Label>To'xtatilgan urinishlar</Label>
      <List>
        {MOCK.apps.slice(0, 4).map((a, i) => (
          <Row key={a.id} title={a.name} value={String([47, 31, 18, 9][i])} />
        ))}
      </List>
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
  heroSub: { fontFamily: font.semibold, fontSize: size.tiny, color: '#8A5A11', marginTop: 2 },
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
