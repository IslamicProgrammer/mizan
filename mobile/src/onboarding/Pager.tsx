/**
 * The onboarding pager.
 *
 * The animation is driven by the gesture, not by a timer. `progress` is a
 * fractional page index that tracks the finger, and every moving part reads
 * from it — the progress bar, the parallax, the staggered entrance of each
 * option. That means a half-swipe looks half-done and reverses correctly if
 * you change your mind, which a `useEffect` + `withTiming` entrance cannot do.
 *
 * `usePager` owns both the shared values and the gesture that writes to them.
 * Splitting those apart (creating the values here, mutating them in `Pager`)
 * means mutating a hook argument, which the React Compiler correctly rejects.
 */
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { motion } from '../design/tokens';

/** Past this fraction of a page, or this flick speed, we commit to the turn. */
const COMMIT_RATIO = 0.3;
const COMMIT_VELOCITY = 500;
/** Resistance applied when dragging beyond the first or last page. */
const RUBBER = 0.3;

export type PagerRender = (args: {
  index: number;
  /** Fractional page index, shared between the UI and worklets. */
  progress: SharedValue<number>;
}) => React.ReactNode;

export function usePager(count: number, onSettle?: (page: number) => void) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const index = useSharedValue(0);
  const start = useSharedValue(0);
  const progress = useDerivedValue(() => -x.get() / width, [width]);

  const tick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const settle = useCallback(
    (page: number) => {
      onSettle?.(page);
    },
    [onSettle],
  );

  const goTo = useCallback(
    (i: number, velocity = 0) => {
      'worklet';
      const clamped = Math.min(Math.max(i, 0), count - 1);
      index.set(clamped);
      x.set(withSpring(-clamped * width, { ...motion.spring, velocity }));
      return clamped;
    },
    [count, width, x, index],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        // let vertical scrolling inside a page win; claim only clear horizontal drags
        .activeOffsetX([-14, 14])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          start.set(x.get());
        })
        .onUpdate((e) => {
          const next = start.get() + e.translationX;
          const min = -(count - 1) * width;
          x.set(next > 0
              ? next * RUBBER
              : next < min
                ? min + (next - min) * RUBBER
                : next);
        })
        .onEnd((e) => {
          const moved = -(x.get() - start.get()) / width;
          const flick = -e.velocityX;
          const commit =
            Math.abs(moved) > COMMIT_RATIO || Math.abs(flick) > COMMIT_VELOCITY;
          const dir = commit ? Math.sign(moved || flick) : 0;
          const want = index.get() + dir;
          const landed = goTo(want, -e.velocityX);
          if (landed !== index.get() || dir !== 0) {
            runOnJS(settle)(landed);
            if (dir !== 0) runOnJS(tick)();
          }
        }),
    [count, width, x, start, index, goTo, settle, tick],
  );

  return { x, progress, index, goTo, gesture, width };
}

export type PagerState = ReturnType<typeof usePager>;

export function Pager({
  count,
  render,
  pager,
}: {
  count: number;
  render: PagerRender;
  pager: PagerState;
}) {
  // Destructure BEFORE the worklet. A worklet serializes everything it closes
  // over, so referencing `pager.x` inside it captures the whole `pager` object —
  // including `gesture` — and Worklets throws "Cannot copy value of type
  // `PanGesture`". Capture the shared values themselves, never their container.
  const { x, width, progress, gesture } = pager;

  const track = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.track, { width: width * count }, track]}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={{ width }}>
            {render({ index: i, progress })}
          </View>
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

/** Content drifts slower than the page it sits on, which reads as depth. */
export function useParallax(
  progress: SharedValue<number>,
  page: number,
  depth: number,
) {
  const { width } = useWindowDimensions();
  return useAnimatedStyle(() => {
    const d = page - progress.get();
    return { transform: [{ translateX: d * width * depth }] };
  });
}

/**
 * Staggered entrance tied to the drag. Each item starts a little later than
 * the one above it, so the list assembles top-down as the page arrives.
 */
export function useStagger(
  progress: SharedValue<number>,
  page: number,
  i: number,
  step = 0.07,
) {
  return useAnimatedStyle(() => {
    const t = Math.max(0, 1 - Math.abs(page - progress.get()));
    const from = Math.min(i * step, 0.5);
    const local = interpolate(t, [from, 1], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: local,
      transform: [
        { translateY: (1 - local) * 26 },
        { scale: 0.97 + local * 0.03 },
      ],
    };
  });
}

const styles = StyleSheet.create({
  track: { flex: 1, flexDirection: 'row' },
});
