import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Bar, Label, List, Note, Screen } from '../../components/ui';
import { MOCK, type BlockableApp } from '../../data/store';
import { color, font, lift, size } from '../../design/tokens';

/**
 * App picker, matching design-v3/app-picker.html.
 *
 * DEVIATION: the mockup fills the letter tile with an orange-to-magenta
 * gradient. That is off-palette, and the same gradient on the focus screen was
 * close enough to a real app's brand to be a trademark problem, so both use a
 * warm neutral here. At runtime Android supplies each app's real icon through
 * packageManager.getApplicationIcon(pkg) and the letter disappears entirely.
 */
function LetterTile({ name }: { name: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileText}>{name[0].toUpperCase()}</Text>
    </View>
  );
}

function CheckCircle({ on }: { on: boolean }) {
  return (
    <View style={[s.check, on && s.checkOn]}>
      {on ? (
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path
            d="M20 6 9 17l-5-5"
            stroke="#FFF"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </View>
  );
}

function AppRow({ app, onToggle }: { app: BlockableApp; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: app.blocked }}
      onPress={() => {
        Haptics.selectionAsync();
        onToggle();
      }}
      style={s.row}
    >
      <LetterTile name={app.name} />
      <View style={s.rowText}>
        <Text style={s.rowTitle}>{app.name}</Text>
        <Text style={s.rowSub}>Kuniga {app.usage}</Text>
      </View>
      <CheckCircle on={app.blocked} />
    </Pressable>
  );
}

export default function AppPicker() {
  const [apps, setApps] = useState<BlockableApp[]>(MOCK.apps.map((a) => ({ ...a })));
  const toggle = (id: string) =>
    setApps((list) => list.map((a) => (a.id === id ? { ...a, blocked: !a.blocked } : a)));

  const count = apps.filter((a) => a.blocked).length;

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Ilovalar" onBack={() => router.back()} right={<Text style={s.count}>{count}</Text>} />

      <Label>Eng ko&apos;p vaqt oladiganlar</Label>
      <List>
        {apps.slice(0, 4).map((a) => (
          <AppRow key={a.id} app={a} onToggle={() => toggle(a.id)} />
        ))}
      </List>

      <Label>Boshqa ilovalar</Label>
      <List>
        {apps.slice(4).map((a) => (
          <AppRow key={a.id} app={a} onToggle={() => toggle(a.id)} />
        ))}
      </List>

      <Note icon="shield">Telefon, SMS va xarita ilovalari hech qachon bloklanmaydi.</Note>
    </Screen>
  );
}

const s = StyleSheet.create({
  count: { fontFamily: font.bold, fontSize: size.body, color: color.inkSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 16 },
  tile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#B3A188',
    alignItems: 'center',
    justifyContent: 'center',
    ...lift.low,
  },
  tileText: { fontFamily: font.extrabold, fontSize: 15, color: '#FFF8EC' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.bold, fontSize: 15, color: color.ink },
  rowSub: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.6,
    borderColor: '#DFD3BE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: color.accent, borderColor: color.accent },
});
