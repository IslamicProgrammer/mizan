import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Bars, Label, Ring, Screen, Segment, Tiles } from '../components/ui';
import { MOCK } from '../data/store';
import { font, layout, lift, size } from '../design/tokens';

export default function Stats() {
  const [range, setRange] = useState(1);
  const pct = Math.round((MOCK.monthPrayed / MOCK.monthTotal) * 100);

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
          <Text style={s.ringTitle}>Sentabr muntazamligi</Text>
          <Text style={s.ringSub}>
            {MOCK.monthPrayed} / {MOCK.monthTotal} namoz
          </Text>
          <Text style={s.ringDelta}>avgustdan +6%</Text>
        </View>
      </View>

      <Label>Namoz bo'yicha</Label>
      <Bars items={MOCK.consistency.map((c) => ({ ...c }))} />

      <View style={s.gap} />
      <Tiles
        items={[
          { value: String(MOCK.streak), label: 'kunlik Bomdod' },
          { value: `${Math.floor(MOCK.focusMinutes / 60)}s ${MOCK.focusMinutes % 60}d`, label: 'fokus vaqti' },
        ]}
      />
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
  ringDelta: { fontFamily: font.semibold, fontSize: size.tiny, color: '#8A6222', marginTop: 3 },
});
