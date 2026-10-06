import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Bar, Empty, List, Note, Row, Screen } from '../components/ui';
import { FIVE, PRAYER_NAMES } from '../data/prayer';
import { useStore } from '../data/store';
import { color, font, layout, lift, size } from '../design/tokens';

/**
 * Make-up prayers. Deliberately framed as a count you chip away at, not a debt
 * — the note says so, and the copy must stay that way.
 *
 * Backed by the store now, not local state: the whole point of this screen is
 * the number of prayers still owed, so it has to survive navigating away and
 * coming back.
 */
export default function Qaza() {
  const { qaza, setQaza } = useStore();
  const total = FIVE.reduce((sum, id) => sum + (qaza[id] ?? 0), 0);

  const repay = (id: (typeof FIVE)[number]) => setQaza(id, (qaza[id] ?? 0) - 1);

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
        <Text style={s.heroSub}>namoz</Text>
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
            sub={qaza[id] === 0 ? 'Toza' : undefined}
            value={String(qaza[id] ?? 0)}
            right={
              qaza[id] > 0 ? (
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
  mk: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: color.inkWarm },
  mkText: { fontFamily: font.bold, fontSize: 11.5, color: color.onDark },
});
