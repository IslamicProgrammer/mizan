import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '../../components/ui';
import { useStore } from '../../data/store';
import { font, layout, size } from '../../design/tokens';

const TARGET_LABEL = { mat: 'Joynamozni', sink: 'Rakovinani', both: 'Joynamoz yoki rakovinani' };

/**
 * The Fajr scan.
 *
 * The camera preview is REAL. The detection is MOCKED — it succeeds on a timer.
 * Choosing a CV approach (on-device classifier vs. embedding match vs. a
 * cloud call) is an open decision, and faking it here means the rest of the
 * flow can be judged without pre-committing to one.
 *
 * Whatever replaces this must keep the promise the onboarding makes: the app
 * confirms it SAW the object, never that a prayer was performed. And frames
 * must not leave the device.
 */
const MOCK_DETECT_MS = 3200;

export default function Scan() {
  const insets = useSafeAreaInsets();
  const { settings } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [progress, setProgress] = useState(0);
  const done = useRef(false);

  const sweep = useSharedValue(0);
  const ring = useAnimatedStyle(() => ({ opacity: 0.4 + sweep.get() * 0.6 }));

  useEffect(() => {
    if (!permission?.granted) return;
    const started = Date.now();
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / MOCK_DETECT_MS);
      setProgress(p);
      sweep.set(withTiming(p));
      if (p >= 1 && !done.current) {
        done.current = true;
        clearInterval(t);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/alarm/success');
      }
    }, 80);
    return () => clearInterval(t);
  }, [permission?.granted, sweep]);

  if (!permission) return <View style={s.screen} />;

  if (!permission.granted) {
    return (
      <View style={[s.screen, s.center, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={s.askTitle}>Kamera ruxsati kerak</Text>
        <Text style={s.askBody}>
          Signalni to'xtatish uchun buyumni kameraga ko'rsatasiz. Rasm saqlanmaydi va hech qayerga
          yuborilmaydi.
        </Text>
        <View style={s.askFoot}>
          <Button label="Ruxsat berish" onPress={requestPermission} />
          <Pressable accessibilityRole="button" onPress={() => router.replace('/home')} style={s.skip}>
            <Text style={s.skipText}>Hozir emas</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      <View style={[s.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 26 }]}>
        <View style={s.top}>
          <Text style={s.kicker}>KAMERANI QARATING</Text>
          <Text style={s.title}>{TARGET_LABEL[settings.scanObject]} kadrga oling</Text>
        </View>

        <View style={s.flex} />

        <Animated.View style={[s.reticle, ring]}>
          <Svg width={210} height={210} viewBox="0 0 210 210">
            <Circle
              cx={105}
              cy={105}
              r={96}
              stroke="rgba(255,243,222,.25)"
              strokeWidth={5}
              fill="none"
            />
            <Circle
              cx={105}
              cy={105}
              r={96}
              stroke="#E8B762"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 96}
              strokeDashoffset={2 * Math.PI * 96 * (1 - progress)}
              fill="none"
              transform="rotate(-90 105 105)"
            />
          </Svg>
          <Text style={s.pct}>{Math.round(progress * 100)}%</Text>
        </Animated.View>

        <View style={s.flex} />

        <Text style={s.note}>
          Rasm saqlanmaydi va hech qayerga yuborilmaydi. Ilova buyumni ko'rganini tasdiqlaydi,
          namoz o'qiganingizni emas.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yopish"
          onPress={() => router.replace('/home')}
          style={s.close}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M6 6l12 12M18 6L6 18" stroke="rgba(255,243,222,.6)" strokeWidth={2.2} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>
    </View>
  );
}

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#0E0A05' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.gutter },
  overlay: { ...FILL, alignItems: 'center', paddingHorizontal: layout.gutter },
  top: { alignItems: 'center', gap: 6 },
  kicker: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.4, color: 'rgba(255,243,222,.5)' },
  title: { fontFamily: font.extrabold, fontSize: 21, color: '#FFF3DE' },
  reticle: { alignItems: 'center', justifyContent: 'center' },
  pct: { position: 'absolute', fontFamily: font.black, fontSize: 34, color: '#FFF3DE', fontVariant: ['tabular-nums'] },
  note: {
    fontFamily: font.medium,
    fontSize: 11.5,
    lineHeight: 17,
    color: 'rgba(255,243,222,.55)',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  close: { marginTop: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,243,222,.10)' },
  askTitle: { fontFamily: font.extrabold, fontSize: 22, color: '#FFF3DE', textAlign: 'center' },
  askBody: { marginTop: 10, fontFamily: font.medium, fontSize: size.small, lineHeight: 21, color: 'rgba(255,243,222,.6)', textAlign: 'center' },
  askFoot: { alignSelf: 'stretch', marginTop: 26, gap: 8 },
  skip: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontFamily: font.semibold, fontSize: size.small, color: 'rgba(255,243,222,.5)' },
});
