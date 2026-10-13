import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { stopAlarmSound } from '../../../modules/app-watch';
import { ICONS } from '../../data/icons';
import { hhmm, timesFor } from '../../data/prayer';
import { useStore } from '../../data/store';
import { font } from '../../design/tokens';

/**
 * The Fajr alarm, matching design-v3/alarm-ringing.html.
 *
 * ADAPTED in the design system (§5): there is no reference for a 5am alarm, so
 * it is built from the measured numeral treatment and the same gold, on a night
 * ground. The sky is the point — it climbs from near-black to a warm horizon,
 * which is the hour the screen is for. A flat dark fill loses that entirely.
 *
 * Holding the escape for 10s is the only way out besides scanning.
 */
const SKY = ['#141019', '#241B2E', '#43304A', '#7A4A38'] as const;
const ESCAPE_MS = 10_000;

/** Deterministic star field — a random one would shimmer differently each mount. */
const STARS = Array.from({ length: 34 }, (_, i) => {
  const a = (i * 2.399963) % (Math.PI * 2);
  const r = ((i * 37) % 100) / 100;
  return {
    x: 50 + Math.cos(a) * r * 48,
    y: 6 + ((i * 53) % 100) * 0.42,
    s: 0.6 + ((i * 17) % 10) / 9,
  };
});

export default function Ringing() {
  const insets = useSafeAreaInsets();
  const { settings } = useStore();
  const fajr = timesFor(new Date(), settings.madhhab)[0];
  const held = useRef<number | null>(null);
  const calm = useReducedMotion();

  const pulse = useSharedValue(0);
  useEffect(() => {
    // The haptic still fires; only the visual pulse is suppressed, because the
    // alarm must stay attention-getting for everyone.
    if (calm) {
      pulse.set(0.5);
      const t = setInterval(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 1800);
      return () => clearInterval(t);
    }
    pulse.set(
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
    const t = setInterval(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 1800);
    return () => clearInterval(t);
  }, [pulse, calm]);

  const halo1 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.get() * 0.1 }],
    opacity: 0.5 + pulse.get() * 0.5,
  }));
  const halo2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.get() * 0.06 }],
  }));

  return (
    <View style={s.screen}>
      <LinearGradient colors={SKY} locations={[0, 0.4, 0.7, 1]} style={StyleSheet.absoluteFill} />

      <Svg style={StyleSheet.absoluteFill} pointerEvents="none" opacity={0.6}>
        {STARS.map((st, i) => (
          <Circle key={i} cx={`${st.x}%`} cy={`${st.y}%`} r={st.s} fill="#FDF6E9" opacity={0.7} />
        ))}
      </Svg>

      {/* the mosque reads as a white silhouette against the night, not as art */}
      <Image
        source={require('../../../assets/img/hero-mosque.png')}
        style={s.mosque}
        contentFit="contain"
        tintColor="#FFFFFF"
        pointerEvents="none"
      />

      <View style={[s.body, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 10 }]}>
        <View style={s.chip}>
          <Image source={ICONS.fajr} style={s.chipIcon} contentFit="contain" />
          <Text style={s.chipText}>BOMDOD VAQTI</Text>
        </View>

        <Text style={s.time}>{hhmm(fajr.at)}</Text>
        <Text style={s.name}>Bomdod</Text>
        <Text style={s.say}>Turing va joynamozingizni skanerlang</Text>

        <View style={s.spacer} />

        <View style={s.btnWrap}>
          <Animated.View style={[s.h1, halo1]} />
          <Animated.View style={[s.h2, halo2]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skanerlash"
            onPress={() => router.replace('/alarm/scan')}
            style={s.scan}
          >
            <Image source={ICONS.camera} style={s.scanIcon} contentFit="contain" />
            <Text style={s.scanLabel}>Skanerlash</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPressIn={() => {
            held.current = Date.now();
          }}
          onPressOut={() => {
            if (held.current && Date.now() - held.current >= ESCAPE_MS) {
              // The native half of this escape: stops `AlarmService`'s sound
              // and releases its wake lock. Idempotent, so this is safe even
              // when this screen was opened from the "sinab ko'rish" test
              // button or no alarm is actually ringing.
              stopAlarmSound();
              router.replace('/home');
            }
            held.current = null;
          }}
          style={s.esc}
        >
          <Text style={s.escText}>o&apos;chirish uchun 10 soniya bosib turing</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SKY[0] },
  mosque: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 218,
    opacity: 0.20,
  },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(248,220,166,.14)',
  },
  chipIcon: { width: 20, height: 20 },
  chipText: { fontFamily: font.bold, fontSize: 12.5, letterSpacing: 1.4, color: '#F8DCA6' },

  time: {
    marginTop: 32,
    fontFamily: font.black,
    fontSize: 92,
    lineHeight: 98,
    letterSpacing: -3,
    color: '#FDF6E9',
    fontVariant: ['tabular-nums'],
  },
  name: { marginTop: 8, fontFamily: font.bold, fontSize: 22, color: '#E9C9A0' },
  say: {
    marginTop: 26,
    textAlign: 'center',
    fontFamily: font.semibold,
    fontSize: 18,
    lineHeight: 26,
    color: '#F1E1CE',
  },

  spacer: { flex: 1 },
  btnWrap: { width: 176, height: 176, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  h1: { position: 'absolute', inset: 0, borderRadius: 88, backgroundColor: 'rgba(248,220,166,.08)' },
  h2: { position: 'absolute', inset: 20, borderRadius: 68, backgroundColor: 'rgba(248,220,166,.13)' },
  scan: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#F2C274',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: '#E9A644',
    shadowOpacity: 0.4,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  scanIcon: { width: 38, height: 38 },
  scanLabel: { fontFamily: font.extrabold, fontSize: 13.5, color: '#4A3210' },

  esc: {
    marginBottom: 44,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(245,230,210,.24)',
  },
  escText: { fontFamily: font.semibold, fontSize: 12.5, color: '#C7B3A8' },
});
