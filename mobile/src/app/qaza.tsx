import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Bar, Empty, List, Note, Row, Screen } from '../components/ui';
import { FIVE, PRAYER_NAMES } from '../data/prayer';
import { MOCK } from '../data/store';
import { color, font, layout, lift, size } from '../design/tokens';

/**
 * Make-up prayers. Deliberately framed as a count you chip away at, not a debt
 * — the note says so, and the copy must stay that way.
 */
export default function Qaza() {
  const [counts, setCounts] = useState<Record<string, number>>({ ...MOCK.qaza });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const done = 23;
  const pct = Math.round((done / (done + total)) * 100);

  const repay = (id: string) =>
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));

  if (total === 0) {
    return (
      <Screen glow="soft" pad={false}>
        <Bar title="Qazo namozlar" onBack={() => router.back()} />
        <Empty
          icon="check"
          title="Qazo namoz yo'q"
          body="Hammasi o'qilgan. Bir vaqt qolsa, shu yerda ko'rinadi va bittadan qaytarasiz."
          action="Namoz vaqtlariga qaytish"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Qazo namozlar" onBack={() => router.back()} />

      <View style={[s.hero, lift.low]}>
        <Text style={s.heroKey}>QOLGAN</Text>
        <Text style={s.heroNum}>{total}</Text>
        <Text style={s.heroSub}>namoz · sentabrdan beri</Text>
        <View style={s.track}>
          <View style={[s.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={s.heroFoot}>{done} tasi qaytarildi · {pct}%</Text>
      </View>

      <Note icon="heart">
        Bu qarz daftari emas. Har kuni bittadan qaytarsangiz ham, bu yaxshi.
      </Note>

      <View style={s.gap} />
      <List>
        {FIVE.map((id) => (
          <Row
            key={id}
            icon={id}
            title={PRAYER_NAMES[id]}
            sub={counts[id] === 0 ? 'Toza' : undefined}
            value={String(counts[id] ?? 0)}
            right={
              counts[id] > 0 ? (
                <Pressable accessibilityRole="button" onPress={() => repay(id)} style={s.mk}>
                  <Text style={s.mkText}>Qaytardim</Text>
                </Pressable>
              ) : undefined
            }
          />
        ))}
      </List>
    </Screen>
  );
}

const s = StyleSheet.create({
  gap: { height: 14 },
  hero: {
    marginTop: 4,
    marginHorizontal: layout.gutter,
    padding: 22,
    borderRadius: layout.radius.lg,
    backgroundColor: color.surface,
    alignItems: 'center',
  },
  heroKey: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: '#7E6A4D' },
  heroNum: { fontFamily: font.black, fontSize: 56, lineHeight: 62, letterSpacing: -2, color: color.inkWarm },
  heroSub: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft },
  track: { alignSelf: 'stretch', height: 8, borderRadius: 999, backgroundColor: 'rgba(80,50,15,.09)', marginTop: 16, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: '#7E9B78' },
  heroFoot: { fontFamily: font.semibold, fontSize: 11.5, color: color.inkSoft, marginTop: 8 },
  mk: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: color.inkWarm },
  mkText: { fontFamily: font.bold, fontSize: 11.5, color: color.onDark },
});
