import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Label, List, Note, Row, Screen } from '../../components/ui';
import { ICONS } from '../../data/icons';
import { MOCK } from '../../data/store';
import { color, font, layout, lift } from '../../design/tokens';

/**
 * Monthly reports. Shows $0 on purpose — the app has not earned anything yet,
 * and showing zero is more honest than hiding the screen until it is flattering.
 */
export default function Reports() {
  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Oylik hisobotlar" onBack={() => router.back()} />

      <View style={[s.zero, lift.low]}>
        <View style={s.mark}>
          <Image source={ICONS.calendar} style={s.markIcon} contentFit="contain" />
        </View>
        <Text style={s.zeroNum}>${MOCK.charity.givenTotal}</Text>
        <Text style={s.zeroLead}>hozircha berilgan</Text>
        <Text style={s.zeroSub}>
          Ilova endi ishga tushdi. Hali daromad yo'q, demak taqsimlanadigan foyda ham yo'q.
        </Text>
      </View>

      <View style={[s.soon, lift.high]}>
        <Image source={ICONS.bell} style={s.soonIcon} contentFit="contain" />
        <View style={s.flex}>
          <Text style={s.soonTitle}>Birinchi hisobot: {MOCK.charity.firstReport}</Text>
          <Text style={s.soonSub}>Har oyning 5-sanasida oldingi oy hisoboti e'lon qilinadi.</Text>
        </View>
      </View>

      <Label>Shu paytgacha nima qilindi</Label>
      <List>
        <Row icon="check" title="Hisoblash usuli e'lon qilindi" sub="Sof foyda qanday hisoblanishi yozib qo'yilgan" />
        <Row icon="check" title="Xayriya hamkori tanlanmoqda" sub="Hujjat va chek bera oladigan tashkilot kerak" />
        <Row icon="calendar" title="Birinchi hisobot" sub="Dekabr oyi yakunlangach" dim />
      </List>

      <Label>Namuna hisobot</Label>
      <List>
        <Row
          icon="gift"
          title={MOCK.charity.sample.month}
          sub="Hisobot qanday ko'rinishini ko'rsatuvchi namuna"
          chevron
          onPress={() => router.push('/charity/report')}
        />
      </List>

      <Note icon="heart">
        Nol ko'rsatish bizga yoqmaydi, lekin yashirishdan ko'ra halolroq.
      </Note>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  zero: {
    marginTop: 4,
    marginHorizontal: layout.gutter,
    padding: 26,
    borderRadius: layout.radius.lg,
    backgroundColor: color.surface,
    alignItems: 'center',
  },
  mark: { width: 56, height: 56, borderRadius: 19, backgroundColor: 'rgba(80,50,15,.07)', alignItems: 'center', justifyContent: 'center' },
  markIcon: { width: 30, height: 30 },
  zeroNum: { marginTop: 10, fontFamily: font.black, fontSize: 48, letterSpacing: -1.8, color: color.inkWarm },
  zeroLead: { fontFamily: font.bold, fontSize: 14, color: color.inkSoft },
  zeroSub: { marginTop: 8, fontFamily: font.medium, fontSize: 12.5, lineHeight: 19, color: color.inkSoft, textAlign: 'center' },
  soon: {
    marginTop: 14,
    marginHorizontal: layout.gutter,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#F5D699',
    flexDirection: 'row',
    gap: 13,
    alignItems: 'flex-start',
  },
  soonIcon: { width: 30, height: 30 },
  soonTitle: { fontFamily: font.extrabold, fontSize: 14.5, color: '#40290C' },
  soonSub: { fontFamily: font.semibold, fontSize: 12.5, lineHeight: 18, color: '#8A5A11', marginTop: 3 },
});
