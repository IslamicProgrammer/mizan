import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Bar, IconButton, Label, List, Row, Screen, Toggle } from '../../components/ui';
import { FIVE, PRAYER_NAMES } from '../../data/prayer';
import { MOCK, useStore } from '../../data/store';
import { color, font } from '../../design/tokens';

export default function FocusHome() {
  const { settings, patchSettings } = useStore();
  const blocked = MOCK.apps.filter((a) => a.blocked).length;

  return (
    <Screen glow="soft" pad={false}>
      <Bar
        title="Fokus"
        onBack={() => router.back()}
        right={
          <IconButton label="Statistika" onPress={() => router.push('/focus/stats')}>
            <Text style={s.mini}>􀥷</Text>
          </IconButton>
        }
      />

      <List>
        <Row
          icon="shield"
          title="Fokus yoqilgan"
          sub="Keyingi bloklash: Asr · 16:34"
          on={settings.focusEnabled}
          right={<Toggle value={settings.focusEnabled} onChange={(v) => patchSettings({ focusEnabled: v })} />}
        />
      </List>

      <Label>Rejim</Label>
      <List>
        <Row icon="feather" title="Yumshoq" sub="Faqat eslatma, bloklash yo'q" />
        <Row icon="focus_deep" title="Chuqur fokus" sub="Namozdan oldin ham keyin ham" right={<Text style={s.premium}>PREMIUM</Text>} />
      </List>

      <Label>Qaysi namozlarda</Label>
      <List>
        {FIVE.map((p) => (
          <Row key={p} icon={p} title={PRAYER_NAMES[p]} right={<Toggle value={p !== 'maghrib'} />} />
        ))}
      </List>

      <Label>Ilovalar</Label>
      <List>
        <Row
          icon="apps"
          title="Bloklanadigan ilovalar"
          sub={`${blocked} ta tanlangan`}
          chevron
          onPress={() => router.push('/focus/apps')}
        />
        <Row
          icon="lock"
          title="Bloklash ekranini ko'rish"
          sub="Namoz vaqtida qanday ko'rinadi"
          chevron
          onPress={() => router.push('/focus/active')}
        />
      </List>
    </Screen>
  );
}

const s = StyleSheet.create({
  mini: { fontSize: 15, color: color.ink },
  premium: { fontFamily: font.bold, fontSize: 9.5, letterSpacing: 0.8, color: '#8A5A11' },
});
