import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Bar, Button, Screen, Segment } from '../components/ui';
import { useStore } from '../data/store';
import { color, font, layout, motion, size } from '../design/tokens';

const TARGETS = [33, 99, 100];

/* ---------------------------------------------------------------- the strand */

/**
 * Beads ride a circular arc whose centre sits RADIUS below the apex, so
 * ARC_CY must be ARC_TOP + RADIUS. Passing a centre smaller than the radius
 * renders the whole strand above the screen.
 */
const RADIUS = 380;
const STRAND_H = 250;
const ARC_TOP = 46;
const ARC_CY = ARC_TOP + RADIUS;

const BEAD = 46;
/** Spacing just over one bead wide, so the strand reads as beads touching. */
const STEP = (BEAD * 1.06) / RADIUS;
const SPAN = 6;

/**
 * Photo-real turned wood, not coloured circles. The specular highlight and the
 * falloff are what make it read as a bead; a flat disc reads as a dot whatever
 * colour it is.
 */
const ART = {
  on: require('../../assets/img/bead-on.png'),
  done: require('../../assets/img/bead-done.png'),
  off: require('../../assets/img/bead-off.png'),
} as const;

function Bead({
  index,
  offset,
  width,
}: {
  index: number;
  offset: SharedValue<number>;
  width: number;
}) {
  const style = useAnimatedStyle(() => {
    const d = index - offset.get();
    const angle = d * STEP;

    const x = width / 2 + RADIUS * Math.sin(angle) - BEAD / 2;
    const y = ARC_CY - RADIUS * Math.cos(angle) - BEAD / 2;

    const away = Math.abs(d);
    const scale = interpolate(away, [0, 1, SPAN], [1.1, 0.95, 0.62], 'clamp');
    const opacity = interpolate(away, [0, SPAN - 2, SPAN], [1, 0.5, 0], 'clamp');

    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }, { rotate: `${angle}rad` }],
      opacity,
    };
  });

  // The three woods cross-fade rather than switch, so a bead passing the centre
  // looks like it is being told over, not repainted.
  const liveA = useAnimatedStyle(() => {
    const d = Math.abs(index - offset.get());
    return { opacity: interpolate(d, [0, 0.55], [1, 0], 'clamp') };
  });
  const doneA = useAnimatedStyle(() => {
    // index 0 and below is strand that was never counted
    if (index <= 0) return { opacity: 0 };
    const d = index - offset.get();
    return { opacity: interpolate(d, [-1, -0.45], [1, 0], 'clamp') };
  });

  return (
    <Animated.View style={[s.bead, style]}>
      <Image source={ART.off} style={s.art} contentFit="contain" />
      <Animated.View style={[s.layer, doneA]}>
        <Image source={ART.done} style={s.art} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[s.layer, liveA]}>
        <Image source={ART.on} style={s.art} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}

/** The cord the beads are strung on. */
function Cord({ width }: { width: number }) {
  const half = width / 2;
  const a = (SPAN + 1) * STEP;
  const pts: string[] = [];
  for (let t = -a; t <= a; t += a / 28) {
    pts.push(`${half + RADIUS * Math.sin(t)},${ARC_CY - RADIUS * Math.cos(t)}`);
  }
  return (
    <Svg width={width} height={STRAND_H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path
        d={`M${pts.join(' L')}`}
        stroke="rgba(80,50,15,.20)"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------- screen */

export default function Tasbih() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // In the store, not local state: losing a count of 99 to a back tap is
  // unforgivable, and this screen is left and returned to constantly.
  const { tasbih, setTasbih } = useStore();
  const { count, targetIdx } = tasbih;
  const goal = TARGETS[targetIdx];

  const offset = useSharedValue(count);
  const pop = useSharedValue(0);

  const bump = useCallback(() => {
    const next = count + 1;
    setTasbih({ count: next, targetIdx });
    offset.set(
      withSpring(next, {
        damping: 18,
        stiffness: 230,
        mass: 0.75,
        reduceMotion: ReduceMotion.System,
      }),
    );
    pop.set(
      withTiming(1, { duration: 70 }, () => {
        pop.set(withTiming(0, { duration: 160 }));
      }),
    );

    // NO SOUND. Counting happens quietly, often in company — a click on every
    // bead is intrusive. The haptic alone confirms the tap.
    if (next % goal === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.selectionAsync();
    }
  }, [count, targetIdx, goal, offset, pop, setTasbih]);

  const reset = useCallback(() => {
    setTasbih({ count: 0, targetIdx });
    offset.set(withSpring(0, motion.spring));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [offset, targetIdx, setTasbih]);

  // re-entering the screen should land on the saved count, not animate up to it
  useEffect(() => {
    offset.set(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const numStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pop.get() * 0.04 }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    width: `${((count % goal) / goal) * 100}%`,
  }));

  const laps = Math.floor(count / goal);
  const beads = Array.from({ length: SPAN * 2 + 3 }, (_, i) => Math.round(count) - SPAN - 1 + i);

  return (
    <Screen glow="full" pad={false} scroll={false}>
      <Bar title="Tasbeh" onBack={() => router.back()} />
      <Segment
        options={TARGETS.map(String)}
        index={targetIdx}
        onChange={(i) => {
          setTasbih({ count: 0, targetIdx: i });
          offset.set(withSpring(0, motion.spring));
        }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sanash. Hozir ${count}`}
        onPress={bump}
        style={s.tap}
      >
        <View style={s.middle}>
          <Animated.Text style={[s.count, numStyle]}>{count}</Animated.Text>
          <Text style={s.of}>/ {goal}</Text>
          <View style={s.track}>
            <Animated.View style={[s.fill, barStyle]} />
          </View>
          <Text style={s.hint}>
            {laps > 0 ? `${laps} marta to'liq` : 'ekranning istalgan joyini bosing'}
          </Text>
        </View>

        <View style={s.strand} pointerEvents="none">
          <Cord width={width} />
          {beads.map((i) => (
            <Bead key={i} index={i} offset={offset} width={width} />
          ))}
        </View>
      </Pressable>

      <View style={[s.foot, { paddingBottom: insets.bottom + 12 }]}>
        <Button label="Boshdan boshlash" tone="ghost" onPress={reset} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  tap: { flex: 1 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: STRAND_H * 0.5 },
  count: {
    fontFamily: font.black,
    fontSize: 104,
    lineHeight: 112,
    letterSpacing: -4,
    color: color.inkWarm,
    fontVariant: ['tabular-nums'],
  },
  of: { marginTop: -8, fontFamily: font.bold, fontSize: size.lead, color: color.inkSoft },
  track: {
    marginTop: 22,
    width: 180,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(80,50,15,.12)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999, backgroundColor: color.accent },
  hint: { marginTop: 12, fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft },

  strand: { position: 'absolute', left: 0, right: 0, bottom: 0, height: STRAND_H },
  bead: { position: 'absolute', width: BEAD, height: BEAD },
  layer: { position: 'absolute', top: 0, left: 0, width: BEAD, height: BEAD },
  art: { width: BEAD, height: BEAD },

  foot: { paddingHorizontal: layout.gutter, paddingTop: 10 },
});
