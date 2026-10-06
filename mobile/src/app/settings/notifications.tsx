import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Label, List, Note, Row, Screen, Segment, Toggle } from '../../components/ui';
import { FIVE, PRAYER_NAMES } from '../../data/prayer';
import { useStore } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

const BEFORE = [5, 10, 15, 30];

export default function Notifications() {
  const { settings, patchSettings } = useStore();
  const idx = Math.max(0, BEFORE.indexOf(settings.notifyBefore));

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Bildirishnomalar" onBack={() => router.back()} />

      <Label>Namozdan oldin</Label>
      <List>
        <Row title="Oldindan eslatish" right={<Toggle value />} />
      </List>
      <View style={s.gap} />
      <Segment
        options={BEFORE.map((b) => `${b}d`)}
        index={idx}
        onChange={(i) => patchSettings({ notifyBefore: BEFORE[i] })}
      />

      <Label>Namuna</Label>
      <View style={[s.preview, lift.low]}>
        <View style={s.appRow}>
          <View style={s.appDot} />
          <Text style={s.appName}>Mizan</Text>
          <Text style={s.appWhen}>hozir</Text>
        </View>
        <Text style={s.previewText}>
          Peshingacha {settings.notifyBefore} daqiqa qoldi.
        </Text>
      </View>

      <Label>Namozlar bo'yicha</Label>
      <List>
        {FIVE.map((p, i) => (
          <Row key={p} icon={p} title={PRAYER_NAMES[p]} value={i === 0 ? "Uyg'otgich" : i === 3 ? 'Jimgina' : 'Azon'} chevron />
        ))}
      </List>

      <Note icon="shield">
        Android bildirishnomalarni kechiktirishi mumkin. Aniq vaqtda kelishi uchun batareya
        optimallashtirishini o'chiring.
      </Note>
    </Screen>
  );
}

const s = StyleSheet.create({
  gap: { height: 10 },
  preview: {
    marginHorizontal: layout.gutter,
    padding: 14,
    borderRadius: layout.radius.md,
    backgroundColor: color.surface,
    gap: 6,
  },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appDot: { width: 18, height: 18, borderRadius: 5, backgroundColor: color.inkWarm },
  appName: { flex: 1, fontFamily: font.bold, fontSize: 12, color: color.ink },
  appWhen: { fontFamily: font.medium, fontSize: 11, color: color.inkSoft },
  previewText: { fontFamily: font.medium, fontSize: size.small, color: color.ink },
});
