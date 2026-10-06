import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Magnetometer } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Bar, Screen } from '../components/ui';
import { ICONS } from '../data/icons';
import { TASHKENT, qiblaDegrees } from '../data/prayer';
import { color, font, layout, lift, motion, size } from '../design/tokens';

const DIAL = 300;
const C = DIAL / 2;

/** Within this many degrees of the bearing, the phone counts as aligned. */
const ALIGNED = 8;

/**
 * Qibla compass, matching design-v3/qibla.html.
 *
 * The bearing is real (computed from coordinates). The heading comes from the
 * magnetometer, which a device has and a simulator does not — there the dial
 * simply holds at north, which is honest rather than faked.
 */
export default function Qibla() {
  const bearing = qiblaDegrees();
  const [heading, setHeading] = useState(0);
  const [hasSensor, setHasSensor] = useState(false);
  const rot = useSharedValue(0);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    Magnetometer.isAvailableAsync().then((ok) => {
      setHasSensor(ok);
      if (!ok) return;
      Magnetometer.setUpdateInterval(100);
      sub = Magnetometer.addListener(({ x, y }) => {
        const deg = (Math.atan2(y, x) * 180) / Math.PI;
        setHeading((deg + 360) % 360);
      });
    });
    return () => sub?.remove();
  }, []);

  // Spring rather than snap: magnetometer readings are jittery, and a needle
  // that twitches every frame reads as broken rather than live.
  const target = bearing - heading;
  rot.set(withSpring(target, motion.spring));
  const needle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.get()}deg` }] }));

  const off = Math.abs(((target % 360) + 540) % 360 - 180);
  const aligned = off > 180 - ALIGNED;

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
        <Text style={s.tipText}>
          {hasSensor
            ? "Telefonni tekis ushlang va metall buyumlardan uzoqroq turing. Kompas sozlanmasa, telefonni sakkiz shaklida aylantiring."
            : "Bu qurilmada magnit sensor yo'q, shuning uchun strelka aylanmaydi. Yo'nalish darajasi to'g'ri."}
        </Text>
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
  okText: { fontFamily: font.bold, fontSize: 14, color: '#4A5D46' },
  okTextOff: { color: '#7A6A54' },

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
