import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  type SharedValue,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Bar, List, Row, Screen, SectionHead } from '../../components/ui';
import { FIVE } from '../../data/prayer';
import { useStore, type DayRecord } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

/**
 * The garden.
 *
 * The idea: each day is a plant, and the five prayers are what make it grow.
 * Five stages of growth, five prayers — bare soil, shoot, leaves, more leaves,
 * bud, flower.
 *
 * What it deliberately does NOT do is Forest's loss aversion. Forest kills your
 * tree when you fail, and that is the wrong instinct here: nobody should be
 * punished by an app for missing a prayer. A partial day keeps the growth it
 * earned, and a missed day is REPAIRABLE — Finch's model, where a missed day
 * shows something you can still fix rather than a blank or a cross. Here the
 * repair is real: it is a qaza prayer actually made up.
 *
 * Cycle-mode days pause the garden rather than withering it, which is what
 * design-v3/cycle-mode.html promises in so many words.
 */
const STAGES = [
  require('../../../assets/img/plant-0.png'),
  require('../../../assets/img/plant-1.png'),
  require('../../../assets/img/plant-2.png'),
  require('../../../assets/img/plant-3.png'),
  require('../../../assets/img/plant-4.png'),
  require('../../../assets/img/plant-5.png'),
];

const STAGE_NAME = [
  'Tuproq tayyor',
  'Niholcha chiqdi',
  'Barglar ochildi',
  "O'sib boryapti",
  'G‘uncha paydo bo‘ldi',
  'Gulladi',
];

const HERO_W = 190;
const HERO_H = Math.round((HERO_W * 502) / 420);

/* -------------------------------------------------------------- today's plant */

function TodayPlant({ kept }: { kept: number }) {
  const grow = useSharedValue(kept);
  const sway = useSharedValue(0);
  // An endless idle loop is exactly what the reduced-motion setting is for.
  const calm = useReducedMotion();

  useEffect(() => {
    // a settle-in-the-soil spring, not a pop — it is a plant, not a button
    grow.set(
      withSpring(kept, {
        damping: 13,
        stiffness: 150,
        mass: 0.9,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [kept, grow]);

  useEffect(() => {
    if (calm) {
      sway.set(0);
      return;
    }
    sway.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [sway, calm]);

  // The whole plant breathes, anchored at the soil so only the top moves.
  const breathe = useAnimatedStyle(() => ({
    transform: [
      { translateY: HERO_H / 2 },
      { rotate: `${sway.get() * 1.1}deg` },
      { translateY: -HERO_H / 2 },
      { scale: interpolate(grow.get() % 1, [0, 0.5, 1], [1, 1.035, 1]) },
    ],
  }));

  return (
    <Animated.View style={[s.hero, breathe]}>
      {STAGES.map((src, i) => (
        <Stage key={i} src={src} index={i} grow={grow} />
      ))}
    </Animated.View>
  );
}

/** Stages cross-fade so growth looks continuous rather than like a slideshow. */
function Stage({
  src,
  index,
  grow,
}: {
  src: number;
  index: number;
  grow: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(grow.get() - index);
    return { opacity: interpolate(d, [0, 1], [1, 0], 'clamp') };
  });
  return (
    <Animated.View style={[s.stageLayer, style]}>
      <Image source={src} style={s.stageImg} contentFit="contain" />
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ the plot */

function Plot({
  rec,
  today,
  onRepair,
}: {
  rec: DayRecord;
  today: boolean;
  onRepair?: () => void;
}) {
  const missed = !rec.rest && rec.kept === 0 && !today;
  const body = (
    <View style={[s.plot, today && s.plotToday, rec.rest && s.plotRest]}>
      {rec.rest ? (
        <Text style={s.restMark}>॰</Text>
      ) : (
        <Image source={STAGES[Math.min(5, rec.kept)]} style={s.plotImg} contentFit="contain" />
      )}
      {missed ? (
        <View style={s.repair}>
          <Svg width={11} height={11} viewBox="0 0 24 24">
            <Path
              d="M12 5v14M5 12h14"
              stroke="#FFF8EC"
              strokeWidth={3.4}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </View>
      ) : null}
    </View>
  );
  if (!missed || !onRepair) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Qazo o'qib tiklash" onPress={onRepair}>
      {body}
    </Pressable>
  );
}

/* ------------------------------------------------------------------- screen */

export default function Garden() {
  const { keptToday, recentDays, repairDay, streak, settings } = useStore();
  const days = useMemo(() => recentDays(15), [recentDays]);

  const repair = useCallback(
    (date: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      repairDay(date);
    },
    [repairDay],
  );

  const bloomed = days.filter((d) => d.rec.kept >= 5).length;
  const toGo = 5 - keptToday;

  return (
    <Screen glow="full">
      <Bar title="Bog'" />

      <View style={s.stage}>
        <TodayPlant kept={keptToday} />
      </View>

      <Text style={s.stageName}>{STAGE_NAME[Math.min(5, keptToday)]}</Text>
      <Text style={s.stageSub}>
        {settings.cycleMode
          ? "Hayz kunlari — bog'ingiz to'xtab turadi, qurib qolmaydi"
          : toGo > 0
            ? `Bugun yana ${toGo} ta namoz — keyin gullaydi`
            : "Bugungi gul ochildi. Ertaga yangi nihol."}
      </Text>

      <View style={s.pips}>
        {FIVE.map((p, i) => (
          <View key={p} style={[s.pip, i < keptToday && s.pipOn]} />
        ))}
      </View>

      {toGo > 0 && !settings.cycleMode ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/timetable')}
          style={[s.cta, lift.low]}
        >
          <Text style={s.ctaText}>Namozni belgilash</Text>
        </Pressable>
      ) : null}

      <SectionHead title="So'nggi ikki hafta" action={`${bloomed} gul`} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.strip}
      >
        {days.map((d) => (
          <View key={d.date} style={s.plotWrap}>
            <Plot rec={d.rec} today={d.today} onRepair={() => repair(d.date)} />
            <Text style={[s.plotDay, d.today && s.plotDayOn]}>
              {d.today ? 'Bugun' : d.date.slice(8)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Text style={s.legend}>
        Bo‘sh kunni bosib, qazo o‘qib tiklaysiz. Hech narsa qurib qolmaydi.
      </Text>

      <SectionHead title="Bog'ingiz" />
      <View style={s.gap} />
      <List>
        <Row
          icon="flame"
          title="Uzluksiz kunlar"
          sub="Hayz kunlari uzilish hisoblanmaydi"
          value={String(streak)}
        />
        <Row
          icon="sparkle"
          title="Ochilgan gullar"
          sub="To'liq besh vaqt o'qilgan kunlar"
          value={String(bloomed)}
        />
        <Row
          icon="chart"
          title="To'liq statistika"
          sub="Namoz bo'yicha muntazamlik"
          chevron
          onPress={() => router.push('/stats')}
        />
      </List>
    </Screen>
  );
}

const s = StyleSheet.create({
  gap: { height: 10 },
  stage: { height: HERO_H + 10, alignItems: 'center', justifyContent: 'flex-end' },
  hero: { width: HERO_W, height: HERO_H },
  stageLayer: { position: 'absolute', top: 0, left: 0, width: HERO_W, height: HERO_H },
  stageImg: { width: HERO_W, height: HERO_H },

  stageName: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: font.extrabold,
    fontSize: 23,
    letterSpacing: -0.4,
    color: color.inkWarm,
  },
  stageSub: {
    marginTop: 6,
    marginHorizontal: layout.gutter + 10,
    textAlign: 'center',
    fontFamily: font.medium,
    fontSize: size.small,
    lineHeight: 20,
    color: color.inkSoft,
  },

  pips: { flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 16 },
  pip: { width: 26, height: 6, borderRadius: 3, backgroundColor: 'rgba(80,50,15,.13)' },
  pipOn: { backgroundColor: '#E8B762' },

  cta: {
    alignSelf: 'center',
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: layout.radius.pill,
    backgroundColor: color.surface,
  },
  ctaText: { fontFamily: font.bold, fontSize: size.small, color: color.inkWarm },

  strip: { paddingHorizontal: layout.gutter, gap: 9, paddingVertical: 10 },
  plotWrap: { alignItems: 'center', gap: 5 },
  plot: {
    width: 54,
    height: 62,
    borderRadius: 16,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  plotToday: { backgroundColor: '#F6DCA8' },
  plotRest: { alignItems: 'center', justifyContent: 'center' },
  plotImg: { width: 46, height: 55 },
  restMark: { fontFamily: font.bold, fontSize: 20, color: color.inkSoft },
  repair: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plotDay: { fontFamily: font.semibold, fontSize: 10.5, color: color.inkSoft },
  plotDayOn: { fontFamily: font.bold, color: color.inkWarm },

  legend: {
    marginTop: 2,
    marginHorizontal: layout.gutter,
    fontFamily: font.medium,
    fontSize: size.tiny,
    lineHeight: 17,
    color: color.inkSoft,
  },
});
