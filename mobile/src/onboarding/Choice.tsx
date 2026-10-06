/**
 * The two option shapes used across onboarding: a full-width row (`OptionRow`)
 * and a large square (`PairCard`).
 *
 * Both follow the system's one hard rule — selected and unselected share
 * effectively the same fill, and separation comes from shadow plus a warm tint,
 * never from a border or a darker background.
 */
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { color, font, layout, lift, motion, size } from '../design/tokens';
import { ICONS } from '../data/icons';
import type { Choice } from './content';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Check({ px = 13 }: { px?: number }) {
  return (
    <Svg width={px} height={px} viewBox="0 0 24 24">
      <Path
        d="M20 6 9 17l-5-5"
        stroke="#FFF"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Shared press-down spring: a small, quick squash that reads as physical. */
function usePress() {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.025 }],
  }));
  return {
    style,
    onPressIn: () => {
      pressed.set(withSpring(1, motion.springTight));
    },
    onPressOut: () => {
      pressed.set(withSpring(0, motion.springTight));
    },
  };
}

export function OptionRow({
  choice,
  selected,
  onPress,
}: {
  choice: Choice;
  selected: boolean;
  onPress: () => void;
}) {
  const press = usePress();
  // derived, not assigned during render: assigning a shared value in the
  // render phase races with the UI thread and is flagged by the compiler
  const on = useDerivedValue(() =>
    withTiming(selected ? 1 : 0, { duration: motion.fast }),
  );

  const fill = useAnimatedStyle(() => ({
    backgroundColor: on.get() > 0.5 ? '#FBEFE2' : color.surface,
  }));
  const mark = useAnimatedStyle(() => ({
    backgroundColor: on.get() > 0.5 ? color.accent : 'transparent',
    borderColor: on.get() > 0.5 ? color.accent : '#DFD3BE',
    transform: [{ scale: 0.86 + on.get() * 0.14 }],
  }));
  const tick = useAnimatedStyle(() => ({ opacity: on.get() }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.row, lift.low, fill, press.style]}
    >
      <Image source={ICONS[choice.icon]} style={styles.rowIcon} contentFit="contain" />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{choice.title}</Text>
        {!!choice.sub && <Text style={styles.rowSub}>{choice.sub}</Text>}
      </View>
      <Animated.View style={[styles.mark, mark]}>
        <Animated.View style={tick}>
          <Check />
        </Animated.View>
      </Animated.View>
    </AnimatedPressable>
  );
}

export function PairCard({
  choice,
  selected,
  onPress,
}: {
  choice: Choice;
  selected: boolean;
  onPress: () => void;
}) {
  const press = usePress();
  const on = useDerivedValue(() => withSpring(selected ? 1 : 0, motion.springTight));

  const card = useAnimatedStyle(() => ({
    backgroundColor: on.get() > 0.5 ? '#FBEFE2' : color.surface,
    transform: [{ scale: 1 + on.get() * 0.03 }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.pair, selected ? lift.high : lift.low, card, press.style]}
    >
      <Image source={ICONS[choice.icon]} style={styles.pairIcon} contentFit="contain" />
      <Text style={styles.pairLabel}>{choice.title}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: layout.radius.md,
  },
  rowIcon: { width: 34, height: 34 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.bold, fontSize: size.body, color: color.ink },
  rowSub: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft },
  mark: {
    width: 24,
    height: 24,
    borderRadius: layout.radius.pill,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pair: {
    // NO `flex: 1` here. The wrapper that splits the row already carries it,
    // and this card sits inside that wrapper as a COLUMN child — where flex:1
    // sets flex-basis to 0 and collapses the card to its minimum height,
    // silently dropping the padding and the label. react-native-web resolves
    // that case differently, so the web smoke test renders it correctly and
    // only a device or simulator shows the bug.
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 26,
    borderRadius: layout.radius.lg,
  },
  pairIcon: { width: 46, height: 46 },
  pairLabel: { fontFamily: font.bold, fontSize: size.body, color: color.ink },
});
