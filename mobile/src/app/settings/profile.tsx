import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Button, Screen, Tiles } from '../../components/ui';
import { ICONS } from '../../data/icons';
import { useStore } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

export default function Profile() {
  const { history, keptToday, streak, focusMinutes } = useStore();
  // A real, derived total — every prayer this install ever recorded, plus
  // whatever has been kept so far today (today has not reached `history`
  // yet; see store.tsx's roll-over).
  const totalPrayers = Object.values(history).reduce((sum, rec) => sum + rec.kept, 0) + keptToday;

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Profil" onBack={() => router.back()} />

      {/* Non-pressable: there is no account until Task 8 wires this to
          Google sign-in — a chevron here with nothing behind it would be
          the dead-row defect Task 13 exists to fix. */}
      <View style={s.head}>
        <View style={[s.avatar, lift.high]}>
          <Image source={ICONS.profile} style={s.avatarIcon} contentFit="contain" />
        </View>
        <Text style={s.name}>Hisobga kirish</Text>
        <Text style={s.joined}>Tariximiz saqlanishi uchun hisobga kiring.</Text>
      </View>

      <View style={s.gap} />
      <Tiles
        items={[
          { value: String(totalPrayers), label: 'namoz' },
          { value: String(streak), label: 'kunlik Bomdod' },
          { value: `${Math.floor(focusMinutes / 60)}s`, label: 'fokus' },
        ]}
      />

      {/* "Hisob" (plan, email, data export, devices) only describes a real
          account, which does not exist while signed out — Task 8 wires up
          Google sign-in and brings this section back behind that check. One
          honest "no account" screen beats this section and the identity row
          above stacked together, each implying a different truth. */}

      <View style={s.foot}>
        <Button label="7 kun bepul sinash" onPress={() => {}} />
        <Button label="Chiqish" tone="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  gap: { height: 16 },
  head: { alignItems: 'center', paddingTop: 10 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(80,50,15,.08)', alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { width: 36, height: 36 },
  name: { marginTop: 12, fontFamily: font.extrabold, fontSize: 23, letterSpacing: -0.4, color: color.ink },
  joined: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft, marginTop: 3 },
  foot: { marginTop: 20, marginHorizontal: layout.gutter, gap: 10 },
});
