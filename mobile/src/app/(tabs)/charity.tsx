import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Button, Label, List, Note, Row, Screen } from '../../components/ui';
import { ICONS } from '../../data/icons';

import { color, font, layout, lift, size } from '../../design/tokens';

/**
 * The promise screen. The whole point is that it says how the number is
 * calculated and shows zero honestly, so nothing here should round up or
 * imply money has moved when it has not.
 */
export default function Charity() {
  return (
    <Screen glow="soft">
      <Bar title="Ehson" />

      <View style={[s.vow, lift.high]}>
        <Image source={ICONS.heart} style={s.vowIcon} contentFit="contain" />
        <Text style={s.vowNum}>100%</Text>
        <Text style={s.vowLead}>sof foydamiz xayriyaga</Text>
        <Text style={s.vowSub}>Har oy ochiq hisobot, hujjat va cheklar bilan</Text>
      </View>

      <Label>Sof foyda qanday hisoblanadi</Label>
      <List>
        <Row title="Obunalardan tushgan daromad" right={<Sign>+</Sign>} />
        <Row title="Google Play komissiyasi" dim right={<Sign>−</Sign>} />
        <Row title="Server va xizmatlar" dim right={<Sign>−</Sign>} />
        <Row title="Soliqlar va rasmiy to'lovlar" dim right={<Sign>−</Sign>} />
        <Row title="Xodimlar ish haqi" dim right={<Sign>−</Sign>} />
        <Row icon="heart" title="Qolgani to'liq xayriyaga" right={<Sign>=</Sign>} />
      </List>

      <Note icon="clock">
        Biz daromadning emas, sof foydaning 100% deymiz. Bu farq muhim va biz uni yashirmaymiz.
      </Note>

      <View style={s.foot}>
        <Button label="Oylik hisobotlar" tone="ghost" onPress={() => router.push('/charity/reports')} />
      </View>
    </Screen>
  );
}

function Sign({ children }: { children: string }) {
  return <Text style={s.sign}>{children}</Text>;
}

const s = StyleSheet.create({
  vow: {
    marginTop: 4,
    marginHorizontal: layout.gutter,
    padding: 24,
    borderRadius: layout.radius.lg,
    backgroundColor: '#F2DEDE',
    alignItems: 'center',
    gap: 4,
  },
  vowIcon: { width: 48, height: 48 },
  vowNum: { marginTop: 8, fontFamily: font.black, fontSize: 44, letterSpacing: -1.6, color: '#6E3838' },
  vowLead: { fontFamily: font.bold, fontSize: 15, color: '#844646' },
  vowSub: { marginTop: 4, fontFamily: font.medium, fontSize: 12.5, color: '#8A5B5B', textAlign: 'center' },
  sign: { fontFamily: font.bold, fontSize: size.body, color: color.inkSoft, width: 16, textAlign: 'center' },
  foot: { marginTop: 16, marginHorizontal: layout.gutter },
});
