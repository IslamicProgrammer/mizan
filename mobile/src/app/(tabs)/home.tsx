import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Backdrop } from '../../design/Backdrop';
import { color, font, layout, lift, size } from '../../design/tokens';
import { ICONS, type IconKey } from '../../data/icons';
import { loadDailyAyah, type DailyAyah } from '../../data/ayah';
import { canScheduleExact, isFocusRunning, nextFajrAlarmAt } from '../../../modules/app-watch';
import { nextFajrAt } from '../../data/alarm';
import {
  TASHKENT,
  blockWindow,
  countdown,
  currentPrayer,
  dayMonth,
  hhmm,
  nextPrayer,
  timesFor,
} from '../../data/prayer';
import { useStore, type Settings } from '../../data/store';
import { SectionHead } from '../../components/ui';

/** Qibla, tasbih, stats and charity -- real features, but conveniences next
 * to the two the product exists for, so they sit in one small row rather
 * than beside alarm and focus as if all six carried equal weight (task 27). */
const SECONDARY = [
  { icon: 'compass', label: 'Qibla', to: '/qibla' },
  { icon: 'tasbih', label: 'Tasbeh', to: '/tasbih' },
  { icon: 'chart', label: 'Statistika', to: '/stats' },
  { icon: 'gift', label: 'Ehson', to: '/charity' },
] as const;

type FeatureKey = 'alarm' | 'focus';

type FeatureCard = { icon: IconKey; title: string; sub: string; to: string };

/**
 * What the alarm and focus cards actually say -- read back from the system
 * the same way `settings/alarm.tsx` and `focus/apps.tsx` do, never a second
 * guess at whether either one is really armed. `nextAlarmAt` and
 * `focusRunning` come from the native module; everything else is the same
 * `prayer.ts` arithmetic every other screen already uses.
 */
function featureCard(
  key: FeatureKey,
  now: Date,
  settings: Settings,
  live: { exactAllowed: boolean; nextAlarmAt: number | null; focusRunning: boolean },
): FeatureCard {
  if (key === 'alarm') {
    const at = live.nextAlarmAt ?? nextFajrAt(now, settings.madhhab);
    const sub = !settings.fajrAlarm
      ? "Uyg'otgich o'chirilgan"
      : !live.exactAllowed
        ? 'Ruxsat kerak'
        : "Uyg'otgich yoqilgan";
    return { icon: 'alarm', title: `Bomdod ${hhmm(new Date(at))}`, sub, to: '/settings/alarm' };
  }

  if (live.focusRunning) {
    const minutesLeft = blockWindow(now, settings.madhhab).minutesLeft;
    return { icon: 'shield', title: 'Fokus faol', sub: `${minutesLeft} daqiqa qoldi`, to: '/focus' };
  }
  if (!settings.focusEnabled) {
    return { icon: 'shield', title: 'Fokus', sub: "O'chirilgan", to: '/focus' };
  }
  const next = nextPrayer(now, settings.madhhab);
  return {
    icon: 'shield',
    title: 'Fokus',
    sub: `Keyingi bloklash: ${next.slot.name} · ${hhmm(next.slot.at)}`,
    to: '/focus',
  };
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { settings, marks, primaryFeature } = useStore();
  const [now, setNow] = useState(new Date());

  // Starts `null` and stays that way until `loadDailyAyah` resolves -- no
  // spinner, because this is the first screen the app draws and must never
  // wait on a network call. `null` is also the correct, final state on a
  // first launch offline with nothing cached yet: the card below simply
  // doesn't render, which is the whole point of task 31 over an error card
  // where scripture should be. See `data/ayah.ts` for the cache-then-fetch
  // order this runs in.
  const [ayah, setAyah] = useState<DailyAyah | null>(null);
  useEffect(() => {
    let alive = true;
    loadDailyAyah()
      .then((a) => alive && setAyah(a))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // The hero is a live countdown — a frozen clock is the fastest way to make a
  // demo feel dead. One tick a second is plenty at minute resolution.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Both readings come from a system this screen never sees change
  // directly -- the exact-alarm grant and the focus service's own
  // running flag are both set from outside this component's renders, so
  // they are re-read on every return to this tab, the same snapshot
  // pattern `settings/alarm.tsx` and `focus/apps.tsx` use.
  const [live, setLive] = useState(() => ({
    exactAllowed: canScheduleExact(),
    nextAlarmAt: nextFajrAlarmAt() as number | null,
    focusRunning: isFocusRunning(),
  }));
  useFocusEffect(
    useCallback(() => {
      setLive({
        exactAllowed: canScheduleExact(),
        nextAlarmAt: nextFajrAlarmAt(),
        focusRunning: isFocusRunning(),
      });
    }, []),
  );

  const next = nextPrayer(now, settings.madhhab);
  const left = countdown(next.until);
  const slots = timesFor(now, settings.madhhab).filter((s) => s.id !== 'sunrise');
  const current = currentPrayer(now, settings.madhhab);
  const date = dayMonth(now);

  const secondaryFeature: FeatureKey = primaryFeature === 'alarm' ? 'focus' : 'alarm';
  const primary = featureCard(primaryFeature, now, settings, live);
  const secondary = featureCard(secondaryFeature, now, settings, live);

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

        {/* The primary/secondary pair task 27 added: whichever headline
            feature matches the onboarding `struggle` answer leads, full
            width and carrying real state, with the other demoted beneath
            it at half height -- see `primaryFeatureFor` in data/store.tsx. */}
        <Pressable accessibilityRole="button" onPress={() => router.push(primary.to as never)} style={[s.primary, lift.high]}>
          <View style={s.flex}>
            <Text style={s.primaryKey}>{primaryFeature === 'alarm' ? 'ERTAGA' : 'FOKUS'}</Text>
            <Text style={s.primaryTitle}>{primary.title}</Text>
            <Text style={s.primarySub}>{primary.sub}</Text>
          </View>
          <Image source={ICONS[primary.icon]} style={s.primaryIcon} contentFit="contain" />
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => router.push(secondary.to as never)} style={[s.secondary, lift.low]}>
          <Image source={ICONS[secondary.icon]} style={s.secondaryIcon} contentFit="contain" />
          <View style={s.flex}>
            <Text style={s.secondaryTitle}>{secondary.title}</Text>
            <Text style={s.secondarySub}>{secondary.sub}</Text>
          </View>
        </Pressable>

        <View style={[s.quick, lift.low]}>
          {SECONDARY.map((q) => (
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

        {/* The lower third the owner flagged as empty, and the app's first
            Qur'anic presence anywhere on screen. Absent entirely when
            `ayah` is `null` -- see the effect above -- rather than a
            skeleton or an error state, because there is nothing honest to
            show yet. Now a `Pressable` (task 33): it was deliberately inert
            until the reader existed to open, and a card shaped like a button
            that does nothing on tap was the same defect as a sheet grabber
            that cannot be grabbed -- the reader is that grabber now. */}
        {ayah ? (
          <>
            <SectionHead title="Kunlik oyat" />
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/quran/[surah]',
                  params: { surah: String(ayah.surah), ayah: String(ayah.ayah) },
                })
              }
              style={[s.ayahCard, lift.low]}
            >
              <View style={s.ayahAccent} />
              <Text style={s.ayahArabic}>{ayah.arabic}</Text>
              <Text style={s.ayahUzbek}>{ayah.uzbek}</Text>
              <Text style={s.ayahRef}>{ayah.reference}</Text>
              {/* Sodiq's translation is published only in Cyrillic -- the
                  rest of this app's UI is Latin -- so this line both credits
                  the translator and explains, quietly, why the text above it
                  looks different from everything else on screen. */}
              <Text style={s.ayahCredit}>Tarjima: Muhammad Sodiq Muhammad Yusuf (kirill)</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
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

  primary: {
    marginTop: 16,
    marginHorizontal: layout.gutter,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F3C87E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  primaryKey: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1, color: '#8A5A11' },
  primaryTitle: { fontFamily: font.extrabold, fontSize: size.lead, color: '#40290C', marginTop: 2 },
  primarySub: { fontFamily: font.medium, fontSize: size.tiny, color: '#8A5A11', marginTop: 2 },
  primaryIcon: { width: 40, height: 40 },

  // Half the primary card's height: smaller icon, one line of title and
  // sub each, on the plain surface fill rather than the gold one -- the
  // demotion has to read at a glance, not just by position on the page.
  secondary: {
    marginTop: 10,
    marginHorizontal: layout.gutter,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryIcon: { width: 26, height: 26 },
  secondaryTitle: { fontFamily: font.bold, fontSize: size.small, color: color.ink },
  secondarySub: { fontFamily: font.medium, fontSize: 11.5, color: color.inkSoft, marginTop: 1 },

  quick: {
    marginTop: 14,
    marginHorizontal: layout.gutter,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 24,
    backgroundColor: color.surface,
    flexDirection: 'row',
  },
  quickItem: { flex: 1, alignItems: 'center', gap: 8 },
  quickIcon: { width: 32, height: 32 },
  quickLabel: { fontFamily: font.medium, fontSize: 11.5, color: color.ink },

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

  // This sits in the empty lower third the owner called out, so it is
  // deliberately roomy rather than packed to match the cards above it --
  // the space itself is part of what the card is answering for.
  ayahCard: {
    marginTop: 4,
    marginHorizontal: layout.gutter,
    borderRadius: layout.radius.lg,
    backgroundColor: color.surface,
    padding: 22,
    gap: 14,
  },
  ayahAccent: { width: 28, height: 3, borderRadius: 2, backgroundColor: color.glowPeak },
  ayahArabic: {
    fontFamily: font.arabic,
    fontSize: size.display,
    // Uthmani diacritics sit above and below the baseline and clip at a
    // normal line height -- this is looser than any other text in the app
    // on purpose.
    lineHeight: size.display * 1.95,
    color: color.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ayahUzbek: { fontFamily: font.medium, fontSize: size.body, lineHeight: 24, color: color.inkWarm },
  ayahRef: { fontFamily: font.semibold, fontSize: size.tiny, color: color.inkSoft },
  ayahCredit: { fontFamily: font.regular, fontSize: 10.5, color: color.inkSoft },
});
