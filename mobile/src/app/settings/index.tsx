import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Bar, Label, List, Row, Screen, Toggle } from '../../components/ui';
import { ICONS } from '../../data/icons';
import { useStore } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

// Must be the same URL submitted in the Play Console listing (Task 12) — Task
// 12 verifies the two match. If the domain isn't live yet, this literal is
// still correct to ship: Google Play requires the link to be present and
// reachable, not that it resolve before the app does.
const PRIVACY_URL = 'https://mizanapp.uz/maxfiylik';

export default function Settings() {
  const { settings, patchSettings, reset } = useStore();

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Sozlamalar" onBack={() => router.back()} />

      {/* Non-pressable: there is no account to open until Task 8 wires this
          up to Google sign-in. A chevron here with nothing behind it would
          be the same dead-row defect Task 13 exists to fix. */}
      <View style={[s.profile, lift.low]}>
        <View style={s.avatar}>
          <Image source={ICONS.profile} style={s.avatarIcon} contentFit="contain" />
        </View>
        <View style={s.flex}>
          <Text style={s.profileName}>Hisobga kirish</Text>
          <Text style={s.profileSub}>Tariximiz saqlanishi uchun hisobga kiring.</Text>
        </View>
      </View>

      <Label>Namoz</Label>
      <List>
        <Row
          icon="abacus"
          title="Hisob usuli va mazhab"
          value={settings.madhhab === 'hanafi' ? 'Hanafiy' : 'Shofiiy'}
          chevron
          onPress={() => router.push('/settings/prayer')}
        />
        <Row icon="pin" title="Joylashuv" value="Toshkent" chevron />
        <Row icon="bell" title="Bildirishnomalar" chevron onPress={() => router.push('/settings/notifications')} />
      </List>

      <Label>Shaxsiy</Label>
      <List>
        <Row
          icon="cycle"
          title="Hayz rejimi"
          value={settings.cycleMode ? 'Yoqilgan' : "O'chiq"}
          chevron
          onPress={() => router.push('/settings/cycle')}
        />
        <Row
          icon="alarm"
          title="Bomdod uyg'otgichi"
          value={settings.fajrAlarm ? 'Joynamoz' : "O'chiq"}
          chevron
          onPress={() => router.push('/settings/alarm')}
        />
        <Row
          icon="shield"
          title="Fokus"
          value={settings.focusEnabled ? 'Yoqilgan' : "O'chiq"}
          chevron
          onPress={() => router.push('/focus')}
        />
        <Row
          icon="maghrib"
          title="Tungi ko'rinish"
          right={<Toggle value={settings.nightTheme} onChange={(v) => patchSettings({ nightTheme: v })} />}
        />
      </List>

      <Label>Ilova</Label>
      <List>
        {/* No chevron: there is nothing to choose, v1 ships Uzbek only. A
            chevron here would promise a picker that does not exist. */}
        <Row icon="book" title="Til" value="O'zbekcha" />
        <Row
          icon="lock"
          title="Maxfiylik siyosati"
          chevron
          onPress={() => Linking.openURL(PRIVACY_URL)}
        />
        <Row icon="profile" title="Profil" chevron onPress={() => router.push('/settings/profile')} />
      </List>

      <View style={s.gap} />
      <List>
        {/* A plain re-navigation, no state change — replaying the
            onboarding screens is not the same action as erasing history,
            and conflating the two is what let this row destroy a real
            user's prayer record with no confirmation. */}
        <Row title="Onboardingni qayta ko'rish" onPress={() => router.replace('/onboarding')} />
        <Row
          title="Hammasini o'chirish va qaytadan boshlash"
          onPress={() =>
            Alert.alert(
              "Hammasi o'chiriladi",
              "Namoz tarixingiz, bog'ingiz va sozlamalaringiz butunlay o'chadi. Buni qaytarib bo'lmaydi.",
              [
                { text: 'Bekor qilish', style: 'cancel' },
                {
                  text: "O'chirish",
                  style: 'destructive',
                  onPress: () => {
                    reset();
                    router.replace('/onboarding');
                  },
                },
              ],
            )
          }
        />
      </List>

      <Text style={s.version}>Mizan 0.1.0 · demo</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  gap: { height: 20 },
  profile: {
    marginTop: 4,
    marginHorizontal: layout.gutter,
    padding: 14,
    borderRadius: layout.radius.md,
    backgroundColor: color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(80,50,15,.08)', alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { width: 20, height: 20 },
  profileName: { fontFamily: font.bold, fontSize: 15.5, color: color.ink },
  profileSub: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft, marginTop: 2 },
  version: { textAlign: 'center', marginTop: 22, fontFamily: font.medium, fontSize: 11.5, color: color.inkSoft },
});
