import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Button, Label, List, Note, Row, Screen } from '../../components/ui';
import { SAMPLE_REPORT } from '../../data/charity';
import { ICONS } from '../../data/icons';
import { font, layout, lift } from '../../design/tokens';

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

export default function Report() {
  const r = SAMPLE_REPORT;
  return (
    <Screen glow="soft" pad={false}>
      <Bar title={r.month} onBack={() => router.back()} />

      <Note icon="gift">Namuna — kelgusi hisobot shunday ko'rinadi.</Note>

      <List>
        <Row title="Daromad" value={money(r.revenue)} />
        <Row title="Google Play komissiyasi" value={`−${money(r.play)}`} dim />
        <Row title="Server va xizmatlar" value={`−${money(r.infra)}`} dim />
        <Row title="Soliqlar" value={`−${money(r.tax)}`} dim />
        <Row title="Sof foyda" value={money(r.profit)} />
      </List>

      <View style={[s.gave, lift.high]}>
        <Image source={ICONS.heart} style={s.gaveIcon} contentFit="contain" />
        <View style={s.flex}>
          <Text style={s.gaveKey}>XAYRIYAGA BERILDI</Text>
          <Text style={s.gaveNum}>{money(r.profit)}</Text>
          <Text style={s.gaveSub}>Sof foydaning 100%</Text>
        </View>
      </View>

      <Label>Qayerga berildi</Label>
      <List>
        {r.to.map((t) => (
          <Row key={t.label} icon={t.icon as 'gift'} title={t.label} sub={t.org} value={money(t.amount)} />
        ))}
      </List>

      <View style={s.foot}>
        <Button label="3 ta chekni ko'rish" tone="ghost" onPress={() => {}} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  gave: {
    marginTop: 14,
    marginHorizontal: layout.gutter,
    padding: 20,
    borderRadius: layout.radius.lg,
    backgroundColor: '#F2DEDE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  gaveIcon: { width: 44, height: 44 },
  gaveKey: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: '#A06C6C' },
  gaveNum: { fontFamily: font.black, fontSize: 30, letterSpacing: -1, color: '#6E3838', marginTop: 2 },
  gaveSub: { fontFamily: font.bold, fontSize: 12, color: '#844646', marginTop: 2 },
  foot: { marginTop: 18, marginHorizontal: layout.gutter },
});
