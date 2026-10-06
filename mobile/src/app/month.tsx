import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Screen, Tiles } from '../components/ui';
import { monthYear } from '../data/prayer';
import { MOCK } from '../data/store';
import { color, font, layout, lift, size } from '../design/tokens';

const DAYS = ['D', 'S', 'C', 'P', 'J', 'Sh', 'Y'];

/**
 * Month grid. Each cell is tinted by how many of the five were kept, so a month
 * reads at a glance without needing a legend for every shade.
 */
export default function Month() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; Uzbek weeks start Monday.
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];

  // MOCK: deterministic so the demo looks the same each run.
  const kept = (d: number) => (d > today ? -1 : [5, 5, 4, 5, 3, 5, 5][d % 7]);

  return (
    <Screen glow="soft" pad={false}>
      <Bar
        title={monthYear(now)}
        onBack={() => router.back()}
      />

      <View style={[s.card, lift.low]}>
        <View style={s.week}>
          {DAYS.map((d) => (
            <Text key={d} style={s.weekDay}>
              {d}
            </Text>
          ))}
        </View>
        <View style={s.grid}>
          {cells.map((d, i) => {
            const k = d ? kept(d) : -1;
            return (
              <View key={i} style={s.cellWrap}>
                {d ? (
                  <View style={[s.cell, k === 5 && s.full, k === 4 && s.most, k === 3 && s.some, d === today && s.today]}>
                    <Text style={[s.cellText, k >= 4 && s.cellTextOn]}>{d}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={s.legend}>
        <Dot style={s.full} label="Besh vaqt" />
        <Dot style={s.most} label="Qisman" />
        <Dot style={s.cell} label="Belgilanmagan" />
      </View>

      <View style={s.gap} />
      <Tiles
        items={[
          { value: String(MOCK.monthPrayed), label: "o'qilgan namoz" },
          { value: `${Math.round((MOCK.monthPrayed / MOCK.monthTotal) * 100)}%`, label: 'muntazamlik' },
          { value: String(MOCK.streak), label: 'kunlik Bomdod' },
        ]}
      />
    </Screen>
  );
}

function Dot({ style, label }: { style: object; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, style]} />
      <Text style={s.legendLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  gap: { height: 14 },
  card: {
    marginTop: 4,
    marginHorizontal: layout.gutter,
    padding: 14,
    borderRadius: layout.radius.lg,
    backgroundColor: color.surface,
  },
  week: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontFamily: font.bold, fontSize: 10.5, color: '#7E6A4D' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  cell: { flex: 1, borderRadius: 11, backgroundColor: 'rgba(80,50,15,.05)', alignItems: 'center', justifyContent: 'center' },
  full: { backgroundColor: '#E8B762' },
  most: { backgroundColor: '#F2DCB0' },
  some: { backgroundColor: '#F7EAD3' },
  today: { borderWidth: 2, borderColor: color.inkWarm },
  cellText: { fontFamily: font.semibold, fontSize: size.tiny, color: color.inkSoft },
  cellTextOn: { fontFamily: font.bold, color: '#40290C' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12, marginHorizontal: layout.gutter },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 11, height: 11, borderRadius: 4 },
  legendLabel: { fontFamily: font.medium, fontSize: 11, color: color.inkSoft },
});
