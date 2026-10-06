import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Toggle } from '../components/ui';
import { ICONS } from '../data/icons';
import { PRAYER_NAMES, hhmm, timesFor, type PrayerId } from '../data/prayer';
import { useStore, type PrayerMark } from '../data/store';
import { color, font, layout, lift, size } from '../design/tokens';

const ACTIONS: { key: PrayerMark; label: string; sub?: string; tone: 'yes' | 'later' | 'qaza' }[] = [
  { key: 'done', label: "O'qidim", tone: 'yes' },
  { key: 'late', label: "Keyinroq o'qiyman", tone: 'later' },
  { key: 'qaza', label: "Qazoga qo'shish", sub: 'Keyinroq qaytarasiz', tone: 'qaza' },
];

/**
 * Marking a prayer. Presented as a transparent modal so the screen behind stays
 * visible through the scrim — the sheet is an action on that screen, not a
 * separate place.
 */
export default function PrayerSheet() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: PrayerId }>();
  const { settings, marks, setMark } = useStore();

  const pid = (id ?? 'asr') as PrayerId;
  const slot = timesFor(new Date(), settings.madhhab).find((s) => s.id === pid);
  const mark = marks[pid];

  const choose = (m: PrayerMark) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMark(pid, m);
    router.back();
  };

  return (
    <View style={s.root}>
      <Pressable style={s.scrim} accessibilityLabel="Yopish" accessibilityRole="button" onPress={() => router.back()} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 22 }]}>
        <View style={s.grab} />
        <View style={s.who}>
          {slot ? <Image source={ICONS[slot.icon]} style={s.whoIcon} contentFit="contain" /> : null}
          <View style={s.flex}>
            <Text style={s.whoName}>{PRAYER_NAMES[pid]}</Text>
            <Text style={s.whoTime}>{slot ? `${hhmm(slot.at)} · bugun` : ''}</Text>
          </View>
        </View>

        <View style={s.acts}>
          {ACTIONS.map((a) => {
            const on = mark === a.key;
            return (
              <Pressable
                key={a.label}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => choose(a.key)}
                style={[s.act, s[a.tone], on && s.actOn]}
              >
                {a.tone === 'yes' ? (
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M20 6 9 17l-5-5" stroke="#FBFDF9" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                ) : (
                  <Image source={ICONS[a.tone === 'later' ? 'clock' : 'calendar']} style={s.actIcon} contentFit="contain" />
                )}
                <View style={s.flex}>
                  <Text style={[s.actLabel, a.tone === 'yes' && s.actLabelYes]}>{a.label}</Text>
                  {a.sub ? <Text style={s.actSub}>{a.sub}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={s.jam}>
          <View style={s.flex}>
            <Text style={s.jamTitle}>Jamoat bilan o'qidim</Text>
            <Text style={s.jamSub}>Statistikada alohida ko'rinadi</Text>
          </View>
          <Toggle value={false} />
        </View>
      </View>
    </View>
  );
}

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const s = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...FILL, backgroundColor: 'rgba(43,31,17,.42)' },
  sheet: {
    paddingTop: 14,
    paddingHorizontal: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: color.page,
    gap: 16,
  },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#E6D9C2' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  whoIcon: { width: 48, height: 48 },
  whoName: { fontFamily: font.extrabold, fontSize: 21, letterSpacing: -0.3, color: color.ink },
  whoTime: { fontFamily: font.semibold, fontSize: 12.5, color: color.inkSoft, marginTop: 2 },
  acts: { gap: 10 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderRadius: layout.radius.md },
  actOn: { borderWidth: 2, borderColor: color.accent },
  yes: { backgroundColor: '#7E9B78' },
  later: { backgroundColor: color.surface, ...lift.low },
  qaza: { backgroundColor: '#EDE4D4' },
  actIcon: { width: 22, height: 22 },
  actLabel: { fontFamily: font.bold, fontSize: size.body, color: color.ink },
  actLabelYes: { color: '#FBFDF9' },
  actSub: { fontFamily: font.medium, fontSize: 11.5, color: '#5C4326', marginTop: 1 },
  jam: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(80,50,15,.09)' },
  jamTitle: { fontFamily: font.bold, fontSize: 13.5, color: color.ink },
  jamSub: { fontFamily: font.medium, fontSize: 11.5, color: color.inkSoft, marginTop: 2 },
});
