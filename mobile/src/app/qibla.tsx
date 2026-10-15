import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Bar, Screen } from '../components/ui';
import { isAligned, isCalibrated, usableHeading } from '../data/compass';
import { ICONS } from '../data/icons';
import { TASHKENT, qiblaDegrees } from '../data/prayer';
import { color, font, layout, lift, motion, size } from '../design/tokens';

const DIAL = 300;
const C = DIAL / 2;

/** Within this many degrees of the bearing, the phone counts as aligned. */
const ALIGNED = 8;

/**
 * Why the OS's `trueHeading`, not the raw magnetometer: `trueHeading` is
 * declination-corrected by the platform and comes with a 0-3 calibration
 * `accuracy`, which is the one thing the old `Magnetometer` + `atan2` code
 * had no way to report. Below "medium" (2), the reading is guesswork, and a
 * confident needle here is worse than one that admits it does not know --
 * this is a direction people pray toward.
 *
 * `reason` tracks why there is no trustworthy heading, not just whether
 * there is one, because the honest fallback text differs: a denied location
 * permission is fixable by the user, a missing magnetometer is not.
 */
type Reason = 'granted' | 'denied' | 'no-sensor';

export default function Qibla() {
  const bearing = qiblaDegrees();
  const [heading, setHeading] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [reason, setReason] = useState<Reason>('denied');
  const rot = useSharedValue(0);

  useEffect(() => {
    let live = true;
    let sub: { remove: () => void } | undefined;

    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync().catch(
        () => ({ status: 'denied' as const }),
      );
      if (!live) return;
      if (perm.status !== 'granted') {
        setReason('denied');
        return;
      }
      try {
        sub = await Location.watchHeadingAsync((h) => {
          if (!live) return;
          setHeading(usableHeading(h));
          setAccuracy(h.accuracy);
        });
        if (live) setReason('granted');
        else sub.remove();
      } catch {
        if (live) setReason('no-sensor');
      }
    })();

    return () => {
      live = false;
      sub?.remove();
    };
  }, []);

  const hasSensor = reason === 'granted';
  const calibrated = accuracy !== null && isCalibrated(accuracy);

  // Spring rather than snap: even a calibrated heading is jittery frame to
  // frame, and a needle that twitches every update reads as broken rather
  // than live.
  const target = bearing - heading;
  rot.set(withSpring(target, motion.spring));
  const needle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.get()}deg` }],
    // Dimmed, not hidden: the direction is still the best guess available,
    // but an uncalibrated needle must look less certain than a calibrated
    // one, not identical to it.
    opacity: hasSensor && !calibrated ? 0.55 : 1,
  }));

  const aligned = hasSensor && calibrated && isAligned(bearing, heading, ALIGNED);

  const tip = !hasSensor
    ? reason === 'denied'
      ? "Yo'nalishni tekshirish uchun joylashuv ruxsati kerak. Ruxsat berilmagan bo'lsa, daraja hali ham to'g'ri -- strelka shunchaki aylanmaydi."
      : "Bu qurilmada magnit sensor yo'q, shuning uchun strelka aylanmaydi. Yo'nalish darajasi to'g'ri."
    : !calibrated
      ? "Kompas hali sozlanmagan. Telefonni metall buyumlardan uzoqroq tutib, sakkiz (8) raqami shaklida bir necha marta aylantiring."
      : "Telefonni tekis ushlang va metall buyumlardan uzoqroq turing. Kompas sozlanmasa, telefonni sakkiz shaklida aylantiring.";

  return (
    <Screen glow="soft" pad={false} scroll={false}>
      <Bar title="Qibla" onBack={() => router.back()} />

      <View style={s.dial}>
        <View style={s.ring}>
          <Svg width={DIAL} height={DIAL} style={StyleSheet.absoluteFill}>
            <Circle cx={C} cy={C} r={140} fill={color.surface} />
            <Circle cx={C} cy={C} r={140} stroke="#EFE0C6" strokeWidth={2} fill="none" />
            {/* the bearing ring, dashed so it reads as a scale not a border */}
            <Circle
              cx={C}
              cy={C}
              r={112}
              stroke={color.hairline}
              strokeWidth={1.5}
              strokeDasharray="3 8"
              fill="none"
            />
            <Circle cx={262} cy={150} r={3.5} fill="#D6C3A6" />
            <Circle cx={150} cy={262} r={3.5} fill="#D6C3A6" />
            <Circle cx={38} cy={150} r={3.5} fill="#D6C3A6" />
          </Svg>

          {/* The needle is two-tailed: a terracotta head towards the qibla and a
              pale counterweight behind it, so the direction is unambiguous. */}
          <Animated.View style={[StyleSheet.absoluteFill, needle]}>
            <Svg width={DIAL} height={DIAL}>
              <Path d="M150 62 L164 172 L150 156 L136 172 Z" fill={color.accent} />
              <Path d="M150 238 L136 128 L150 144 L164 128 Z" fill="#E4D6C0" />
              <Circle cx={C} cy={C} r={12} fill="#C0561F" />
              <Circle cx={C} cy={C} r={5} fill="#FFFCF6" />
            </Svg>
          </Animated.View>

          <View style={[s.kaaba, lift.low]}>
            <Image source={ICONS.kaaba} style={s.kaabaIcon} contentFit="contain" />
          </View>

          <Text style={[s.dir, s.dirN]}>SH</Text>
          <Text style={[s.dir, s.dirE]}>SH-Q</Text>
          <Text style={[s.dir, s.dirS]}>J</Text>
          <Text style={[s.dir, s.dirW]}>G&apos;</Text>
        </View>

        <View style={s.deg}>
          <Text style={s.degNum}>{Math.round(bearing)}°</Text>
          <Text style={s.degSub}>{TASHKENT.city}dan Ka&apos;baga yo&apos;nalish</Text>
        </View>

        {hasSensor ? (
          calibrated ? (
            <View style={[s.ok, !aligned && s.okOff]}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d={aligned ? 'M20 6 9 17l-5-5' : 'M12 4v10M12 18h.01'}
                  stroke={aligned ? '#4E6A49' : '#8A7A5E'}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
              <Text style={[s.okText, !aligned && s.okTextOff]}>
                {aligned ? "Telefon to'g'ri yo'nalishda" : 'Telefonni aylantiring'}
              </Text>
            </View>
          ) : (
            <View style={[s.ok, s.okWarn]}>
              <Text style={s.okIcon}>∞</Text>
              <Text style={[s.okText, s.okTextWarn]}>Kompas sozlanmagan</Text>
            </View>
          )
        ) : null}
      </View>

      <View style={[s.tip, lift.low]}>
        <Svg width={17} height={17} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9.5} stroke="#A08B70" strokeWidth={2} fill="none" />
          <Path
            d="M12 16v-4.5M12 8h.01"
            stroke="#A08B70"
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
        <Text style={s.tipText}>{tip}</Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  dial: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: layout.gutter },
  ring: { width: DIAL, height: DIAL },
  kaaba: {
    position: 'absolute',
    left: C - 22,
    top: 6,
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kaabaIcon: { width: 26, height: 26 },

  dir: { position: 'absolute', fontFamily: font.bold, fontSize: size.small, color: color.inkSoft },
  dirN: { left: 0, right: 0, top: 60, textAlign: 'center', fontFamily: font.extrabold, color: color.ink },
  dirE: { right: 26, top: C - 9 },
  dirS: { left: 0, right: 0, bottom: 26, textAlign: 'center' },
  dirW: { left: 26, top: C - 9 },

  deg: { alignItems: 'center', gap: 5 },
  degNum: {
    fontFamily: font.black,
    fontSize: 52,
    lineHeight: 55,
    letterSpacing: -1.8,
    color: color.inkWarm,
    fontVariant: ['tabular-nums'],
  },
  degSub: { fontFamily: font.semibold, fontSize: size.small, color: color.inkSoft },

  ok: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: layout.radius.pill,
    backgroundColor: '#EFF3EC',
  },
  okOff: { backgroundColor: color.pill },
  okWarn: { backgroundColor: color.pill },
  okText: { fontFamily: font.bold, fontSize: 14, color: '#4A5D46' },
  okTextOff: { color: '#7A6A54' },
  okTextWarn: { color: '#8A5A2E' },
  okIcon: { fontSize: 17, fontFamily: font.extrabold, color: '#8A5A2E', lineHeight: 18 },

  tip: {
    marginHorizontal: layout.gutter,
    marginBottom: 26,
    padding: 14,
    borderRadius: 19,
    backgroundColor: color.surface,
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
  },
  tipText: { flex: 1, fontFamily: font.medium, fontSize: 12.5, lineHeight: 19, color: color.inkSoft },
});
