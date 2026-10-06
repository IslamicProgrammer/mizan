import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Button, Label, List, Row, Screen, Tiles } from '../../components/ui';
import { MOCK } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

export default function Profile() {
  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Profil" onBack={() => router.back()} />

      <View style={s.head}>
        <View style={[s.avatar, lift.high]}>
          <Text style={s.avatarText}>{MOCK.profile.name[0]}</Text>
        </View>
        <Text style={s.name}>{MOCK.profile.name}</Text>
        <Text style={s.joined}>Google orqali kirgan · {MOCK.profile.joined}</Text>
      </View>

      <View style={s.gap} />
      <Tiles
        items={[
          { value: String(MOCK.profile.totalPrayers), label: 'namoz' },
          { value: String(MOCK.streak), label: 'kunlik Bomdod' },
          { value: `${Math.floor(MOCK.focusMinutes / 60)}s`, label: 'fokus' },
        ]}
      />

      <Label>Hisob</Label>
      <List>
        <Row icon="heart" title="Bepul reja" sub="Premium bilan ko'proq imkoniyat" chevron />
        <Row title="Email" value="m···@gmail.com" />
        <Row title="Ma'lumotlarimni yuklab olish" chevron />
        <Row title="Boshqa qurilmalar" value="1 ta" chevron />
      </List>

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
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#F3C87E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.black, fontSize: 32, color: '#40290C' },
  name: { marginTop: 12, fontFamily: font.extrabold, fontSize: 23, letterSpacing: -0.4, color: color.ink },
  joined: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft, marginTop: 3 },
  foot: { marginTop: 20, marginHorizontal: layout.gutter, gap: 10 },
});
