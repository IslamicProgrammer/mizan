import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Button, Empty, Label, List, Note, Row, Screen, Toggle } from '../../components/ui';
import { type Cycle, cycleLength, parseYmd } from '../../data/cycles';
import { MONTHS_UZ } from '../../data/prayer';
import { useStore } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

/** "12–17 sentabr" for a cycle inside one month, "27 sentabr – 2 oktabr" for
 * one that crosses a month boundary, "27 sentabr — davom etmoqda" while it
 * is still open. `MONTHS_UZ` only, never `toLocaleDateString`: Hermes ships
 * no `uz-UZ` ICU data. */
function labelFor(cycle: Cycle): string {
  const from = parseYmd(cycle.from);
  if (!cycle.to) {
    return `${from.getDate()} ${MONTHS_UZ[from.getMonth()]} — davom etmoqda`;
  }
  const to = parseYmd(cycle.to);
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()}–${to.getDate()} ${MONTHS_UZ[from.getMonth()]}`;
  }
  return `${from.getDate()} ${MONTHS_UZ[from.getMonth()]} – ${to.getDate()} ${MONTHS_UZ[to.getMonth()]}`;
}

/**
 * Cycle mode. The point is that missed prayers are NOT counted as missed during
 * these days — the copy must keep saying so plainly.
 */
export default function CycleMode() {
  const { settings, patchSettings, cycles } = useStore();
  const now = new Date();
  const open = cycles.length > 0 && cycles[cycles.length - 1]!.to === undefined
    ? cycles[cycles.length - 1]!
    : null;
  // Newest first, same order the old invented list used.
  const history = [...cycles].reverse();

  const heroSub = open
    ? `${cycleLength(open, now)}-kun · ${parseYmd(open.from).getDate()} ${MONTHS_UZ[parseYmd(open.from).getMonth()]}dan beri`
    : 'Boshlanganda yoqing';

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Hayz rejimi" onBack={() => router.back()} />

      <View style={[s.hero, settings.cycleMode && s.heroOn, lift.low]}>
        <View style={s.flex}>
          <Text style={[s.heroTitle, settings.cycleMode && s.onInk]}>
            {settings.cycleMode ? 'Hozir faol' : 'Faol emas'}
          </Text>
          <Text style={[s.heroSub, settings.cycleMode && s.onSub]}>{heroSub}</Text>
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
      {history.length === 0 ? (
        <Empty
          icon="cycle"
          title="Hali yozuv yo'q"
          body="Hayz rejimini yoqsangiz, kunlar shu yerda saqlanadi."
        />
      ) : (
        <List>
          {history.map((c, i) => (
            <Row key={`${c.from}-${i}`} title={labelFor(c)} value={`${cycleLength(c, now)} kun`} />
          ))}
        </List>
      )}

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
