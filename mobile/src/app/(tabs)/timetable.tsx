import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Bar, Chevron, IconButton, Label, List, Row, Screen } from '../../components/ui';
import { color, font, layout, lift } from '../../design/tokens';
import { FIVE, currentPrayer, dayMonth, hhmm, timesFor, weekday } from '../../data/prayer';
import { useStore } from '../../data/store';

export default function Timetable() {
  const { settings, marks, qaza } = useStore();
  const [offset, setOffset] = useState(0);

  const day = new Date();
  day.setDate(day.getDate() + offset);
  const slots = timesFor(day, settings.madhhab);
  const current = offset === 0 ? currentPrayer(new Date(), settings.madhhab) : null;

  const label =
    offset === 0
      ? 'Bugun'
      : offset === 1
        ? 'Ertaga'
        : offset === -1
          ? 'Kecha'
          : dayMonth(day);

  const qazaTotal = FIVE.reduce((sum, id) => sum + (qaza[id] ?? 0), 0);

  return (
    <Screen glow="soft">
      <Bar
        title="Namoz vaqtlari"
        right={
          <View style={s.barBtns}>
            <IconButton label="Qibla" onPress={() => router.push('/qibla')}>
              <Text style={s.mini}>􀖇</Text>
            </IconButton>
            <IconButton label="Oy" onPress={() => router.push('/month')}>
              <Text style={s.mini}>􀉉</Text>
            </IconButton>
          </View>
        }
      />

      <View style={[s.dayNav, lift.low]}>
        <Pressable accessibilityLabel="Oldingi kun" accessibilityRole="button" hitSlop={10} onPress={() => setOffset((o) => o - 1)}>
          <Chevron dir="left" tint={color.inkSoft} />
        </Pressable>
        <View style={s.dayText}>
          <Text style={s.dayTitle}>
            {label} · {dayMonth(day)}
          </Text>
          <Text style={s.daySub}>{weekday(day)}</Text>
        </View>
        <Pressable accessibilityLabel="Keyingi kun" accessibilityRole="button" hitSlop={10} onPress={() => setOffset((o) => o + 1)}>
          <Chevron tint={color.inkSoft} />
        </Pressable>
      </View>

      <View style={s.gap} />
      <List>
        {slots.map((sl) => (
          <Row
            key={sl.id}
            icon={sl.icon}
            title={sl.name}
            sub={marks[sl.id] === 'done' ? `${hhmm(sl.at)} da o'qildi` : undefined}
            value={hhmm(sl.at)}
            on={sl.id === current}
            dim={sl.id === 'sunrise'}
            onPress={
              sl.id === 'sunrise'
                ? undefined
                : () => router.push({ pathname: '/prayer-sheet', params: { id: sl.id } })
            }
          />
        ))}
      </List>

      <Label>Qazo</Label>
      <List>
        <Row
          icon="calendar"
          title="Qazo namozlar"
          sub="Bittadan qaytarib borasiz"
          value={String(qazaTotal)}
          chevron
          onPress={() => router.push('/qaza')}
        />
      </List>
    </Screen>
  );
}

const s = StyleSheet.create({
  barBtns: { flexDirection: 'row', gap: 8 },
  mini: { fontSize: 15, color: color.ink },
  gap: { height: 14 },
  dayNav: {
    marginTop: 4,
    marginHorizontal: layout.gutter,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: layout.radius.md,
    backgroundColor: color.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayText: { flex: 1, alignItems: 'center' },
  dayTitle: { fontFamily: font.bold, fontSize: 14.5, color: color.ink },
  daySub: { fontFamily: font.medium, fontSize: 11.5, color: color.inkSoft, marginTop: 1 },
});
