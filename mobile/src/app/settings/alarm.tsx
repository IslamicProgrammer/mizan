import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Button, Label, List, Note, Row, Screen, Toggle } from '../../components/ui';
import { hhmm, timesFor } from '../../data/prayer';
import { useStore } from '../../data/store';
import { font, layout, lift, size } from '../../design/tokens';

const OBJECTS = [
  { key: 'mat', icon: 'mat', title: 'Joynamozni skanerlash', sub: 'Karavotdan turishni talab qiladi' },
  { key: 'sink', icon: 'tap', title: 'Rakovinani skanerlash', sub: 'Hammomga borish kerak' },
  { key: 'both', icon: 'mat_tap', title: 'Ikkalasi ham', sub: 'Qaysinisi yaqin bo\'lsa' },
] as const;

export default function AlarmSettings() {
  const { settings, patchSettings } = useStore();
  const fajr = timesFor(new Date(), settings.madhhab)[0];

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Bomdod uyg'otgichi" onBack={() => router.back()} />

      <View style={[s.hero, lift.high]}>
        <View style={s.flex}>
          <Text style={s.heroTime}>{hhmm(fajr.at)}</Text>
          <Text style={s.heroSub}>Ertaga · Bomdod vaqtida</Text>
        </View>
        <Toggle value={settings.fajrAlarm} onChange={(v) => patchSettings({ fajrAlarm: v })} />
      </View>

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

      <Note icon="shield">
        Signal aniq vaqtda ishlashi uchun batareya optimallashtirishini o'chiring.
      </Note>

      <View style={s.foot}>
        <Button label="Signalni sinab ko'rish" tone="ghost" onPress={() => router.push('/alarm/ringing')} />
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
  foot: { marginTop: 18, marginHorizontal: layout.gutter },
});
