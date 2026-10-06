import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Backdrop } from '../../design/Backdrop';
import { color, font, layout, lift, size } from '../../design/tokens';
import { ICONS } from '../../data/icons';
import {
  TASHKENT,
  countdown,
  currentPrayer,
  dayMonth,
  hhmm,
  nextPrayer,
  timesFor,
} from '../../data/prayer';
import { useStore } from '../../data/store';
import { SectionHead } from '../../components/ui';

const QUICK = [
  { icon: 'alarm', label: "Uyg'otgich", to: '/settings/alarm' },
  { icon: 'lock', label: 'Fokus', to: '/focus' },
  { icon: 'compass', label: 'Qibla', to: '/qibla' },
  { icon: 'tasbih', label: 'Tasbeh', to: '/tasbih' },
  { icon: 'chart', label: 'Statistika', to: '/stats' },
  { icon: 'gift', label: 'Ehson', to: '/charity' },
] as const;

export default function Home() {
  const insets = useSafeAreaInsets();
  const { settings, marks } = useStore();
  const [now, setNow] = useState(new Date());

  // The hero is a live countdown — a frozen clock is the fastest way to make a
  // demo feel dead. One tick a second is plenty at minute resolution.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const next = nextPrayer(now, settings.madhhab);
  const left = countdown(next.until);
  const slots = timesFor(now, settings.madhhab).filter((s) => s.id !== 'sunrise');
  const current = currentPrayer(now, settings.madhhab);
  const date = dayMonth(now);

  return (
    <View style={s.screen}>
      <Backdrop glow="full" />
      <ScrollView
        style={s.flex}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.head}>
          <Pressable accessibilityRole="button" accessibilityLabel="Menyu" onPress={() => router.push('/settings')}>
            <Svg width={20} height={14} viewBox="0 0 20 14" fill="none" stroke={color.ink} strokeWidth={2} strokeLinecap="round">
              <Path d="M1 1h18M1 7h18M1 13h11" />
            </Svg>
          </Pressable>
          <Text style={s.brand}>Mizan</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Qidirish" onPress={() => router.push('/month')}>
            <Svg width={19} height={19} viewBox="0 0 20 20" fill="none" stroke={color.ink} strokeWidth={2} strokeLinecap="round">
              <Circle cx={8.6} cy={8.6} r={6.4} />
              <Path d="M13.4 13.4 18 18" />
            </Svg>
          </Pressable>
        </View>

        {/* §2: the hero has NO boundary — it sits straight on the glow.
            The mosque sits BEHIND the numerals at 60% and is deliberately
            low-contrast: it is atmosphere, not an illustration to look at. */}
        <View style={s.hero}>
          <Image
            source={require('../../../assets/img/hero-mosque.png')}
            style={s.mosque}
            contentFit="contain"
            tintColor="#FFFCF6"
            pointerEvents="none"
          />
          {/* The reference puts a crescent where the colon's upper dot would
              sit, with a rounded bar beneath it. Two plain dots lose the one
              detail that makes this clock the product's and not a stock one. */}
          <View style={s.clock}>
            <Text style={s.heroNum}>{left.hhmm.slice(0, 2)}</Text>
            <View style={s.sep}>
              <Image source={ICONS.maghrib} style={s.sepMoon} contentFit="contain" />
              <View style={s.sepBar} />
            </View>
            <Text style={s.heroNum}>{left.hhmm.slice(3)}</Text>
          </View>
          {/* two columns split by a rule — straight from the reference */}
          <View style={s.heroMeta}>
            <View style={s.metaCol}>
              <Text style={s.metaKey}>QOLGAN VAQT</Text>
              <Text style={s.metaVal}>
                {next.slot.name} {left.long}
              </Text>
            </View>
            <View style={s.metaRule} />
            <View style={s.metaCol}>
              <Text style={s.metaKey}>{date.toUpperCase()}</Text>
              <Text style={s.metaVal}>{TASHKENT.city}</Text>
            </View>
          </View>
        </View>

        <View style={[s.quick, lift.low]}>
          {QUICK.map((q) => (
            <Pressable
              key={q.label}
              accessibilityRole="button"
              style={s.quickItem}
              onPress={() => router.push(q.to as never)}
            >
              <Image source={ICONS[q.icon]} style={s.quickIcon} contentFit="contain" />
              <Text style={s.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHead title="Namoz vaqtlari" action="Barchasi" />

        {/* §2: cards are 82pt wide with 8pt gaps and the fifth peeks by 14pt,
            which is what tells you the row scrolls. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.strip}
        >
          {slots.map((sl) => {
            const on = sl.id === current;
            const done = marks[sl.id] === 'done';
            return (
              <Pressable
                key={sl.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/prayer-sheet', params: { id: sl.id } })}
                style={[s.card, lift.low, on && s.cardOn]}
              >
                <Image source={ICONS[sl.icon]} style={s.cardIcon} contentFit="contain" />
                <Text style={[s.cardName, on && s.onInk]}>{sl.name}</Text>
                <Text style={[s.cardTime, on && s.onInk, done && s.cardDone]}>{hhmm(sl.at)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings/alarm')}
          style={[s.fajr, lift.high]}
        >
          <View style={s.flex}>
            <Text style={s.fajrKey}>ERTAGA</Text>
            <Text style={s.fajrTitle}>Bomdod {hhmm(timesFor(tomorrow(now), settings.madhhab)[0].at)}</Text>
            <Text style={s.fajrSub}>
              {settings.fajrAlarm ? "Uyg'otgich yoqilgan" : "Uyg'otgich o'chirilgan"}
            </Text>
          </View>
          <Image source={ICONS.alarm} style={s.fajrIcon} contentFit="contain" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function tomorrow(d: Date) {
  const t = new Date(d);
  t.setDate(t.getDate() + 1);
  return t;
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.page },

  head: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
  },
  brand: { fontFamily: font.bold, fontSize: size.title, letterSpacing: -0.2, color: color.ink },

  hero: { paddingTop: 6, paddingBottom: 18, alignItems: 'center' },
  // The hero is a tinted SILHOUETTE, not a picture — see design-system.md §9.
  // Full bleed, pale, and dropped so the dome sits below the numerals rather
  // than behind them, which is what the reference does.
  mosque: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -118,
    height: 218,
    opacity: 0.38,
  },
  heroNum: {
    fontFamily: font.black, // §3: weight 900. Using 300 here is what made v1 look wrong.
    fontSize: 78,
    lineHeight: 88,
    letterSpacing: -3,
    color: color.inkWarm,
    fontVariant: ['tabular-nums'],
  },
  clock: { flexDirection: 'row', alignItems: 'center' },
  sep: { alignItems: 'center', gap: 4, marginHorizontal: 14, paddingBottom: 6 },
  sepMoon: { width: 30, height: 30 },
  sepBar: { width: 7, height: 18, borderRadius: 4, backgroundColor: color.inkWarm },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: layout.gutter,
    marginTop: 2,
  },
  metaCol: { flex: 1, alignItems: 'center', gap: 4 },
  metaRule: { width: 1, height: 34, backgroundColor: color.hairline },
  metaKey: {
    fontFamily: font.medium,
    fontSize: 10,
    letterSpacing: 0.9,
    color: color.inkSoft,
  },
  metaVal: { fontFamily: font.bold, fontSize: size.title, color: color.ink },

  quick: {
    marginTop: 20,
    marginHorizontal: layout.gutter,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 24,
    backgroundColor: color.surface,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickItem: { width: '33.33%', alignItems: 'center', gap: 9, paddingVertical: 8 },
  quickIcon: { width: 40, height: 40 },
  quickLabel: { fontFamily: font.medium, fontSize: size.small, color: color.ink },

  strip: { paddingHorizontal: layout.gutter, gap: layout.cardGap, paddingVertical: 10 },
  card: {
    width: layout.cardW,
    borderRadius: layout.radius.md,
    backgroundColor: color.surface,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 13,
  },
  cardOn: { backgroundColor: '#F3C87E' },
  cardIcon: { width: 26, height: 26 },
  cardName: { fontFamily: font.semibold, fontSize: 11.5, color: color.inkSoft },
  cardTime: { fontFamily: font.bold, fontSize: 15, color: color.ink, fontVariant: ['tabular-nums'] },
  cardDone: { color: '#5F7D59' },
  onInk: { color: '#40290C' },

  fajr: {
    marginTop: 14,
    marginHorizontal: layout.gutter,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F3C87E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  fajrKey: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1, color: '#8A5A11' },
  fajrTitle: { fontFamily: font.extrabold, fontSize: size.lead, color: '#40290C', marginTop: 2 },
  fajrSub: { fontFamily: font.medium, fontSize: size.tiny, color: '#8A5A11', marginTop: 2 },
  fajrIcon: { width: 40, height: 40 },
});
