import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Button, Label, List, Note, Row, Screen, Toggle } from '../../components/ui';
import { useStore } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

const HISTORY = [
  { label: '27-sentabr — davom etmoqda', days: '3 kun' },
  { label: '12–17 sentabr', days: '6 kun' },
  { label: '14–19 avgust', days: '6 kun' },
];

/**
 * Cycle mode. The point is that missed prayers are NOT counted as missed during
 * these days — the copy must keep saying so plainly.
 */
export default function CycleMode() {
  const { settings, patchSettings } = useStore();

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Hayz rejimi" onBack={() => router.back()} />

      <View style={[s.hero, settings.cycleMode && s.heroOn, lift.low]}>
        <View style={s.flex}>
          <Text style={[s.heroTitle, settings.cycleMode && s.onInk]}>
            {settings.cycleMode ? 'Hozir faol' : 'Faol emas'}
          </Text>
          <Text style={[s.heroSub, settings.cycleMode && s.onSub]}>
            {settings.cycleMode ? '3-kun · 27-sentabrdan beri' : 'Boshlanganda yoqing'}
          </Text>
        </View>
        <Toggle value={settings.cycleMode} onChange={(v) => patchSettings({ cycleMode: v })} />
      </View>

      <Label>Bu davrda ilova nima qiladi</Label>
      <List>
        <Row icon="check" title="Namozlar o'tkazib yuborilgan deb belgilanmaydi" />
        <Row icon="check" title="Bog'ingiz to'xtab turadi, qurib qolmaydi" />
        <Row icon="check" title="Namoz eslatmalari o'chiriladi" />
        <Row icon="check" title="Qazo hisobiga qo'shilmaydi" />
      </List>

      <Label>Tarix</Label>
      <List>
        {HISTORY.map((h) => (
          <Row key={h.label} title={h.label} value={h.days} />
        ))}
      </List>

      <Note icon="lock">
        Bu ma'lumot faqat telefoningizda saqlanadi. Serverga yuborilmaydi va hech kim ko'ra olmaydi.
      </Note>

      {settings.cycleMode ? (
        <View style={s.foot}>
          <Button label="Tugadi deb belgilash" onPress={() => patchSettings({ cycleMode: false })} />
        </View>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    marginTop: 4,
    marginHorizontal: layout.gutter,
    padding: 18,
    borderRadius: layout.radius.md,
    backgroundColor: color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroOn: { backgroundColor: '#F2DEDE' },
  heroTitle: { fontFamily: font.bold, fontSize: size.body, color: color.ink },
  heroSub: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft, marginTop: 2 },
  onInk: { color: '#6E3838' },
  onSub: { color: '#8A5B5B' },
  foot: { marginTop: 18, marginHorizontal: layout.gutter },
});
