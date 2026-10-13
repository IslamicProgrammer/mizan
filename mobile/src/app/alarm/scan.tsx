import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Button } from '../../components/ui';
import { getEnv } from '../../data/env';
import { useStore } from '../../data/store';
import { font, layout, size } from '../../design/tokens';

const TARGET_LABEL = { mat: 'Joynamozni', sink: 'Rakovinani', both: 'Joynamoz yoki rakovinani' };

/** Step 7's rewrite of the privacy promise. Sending the frame to Gemini for a
 * yes/no answer makes the old "never leaves the device" sentence false — this
 * is the same wording as `design-v3/11-scanobject.html`, because this
 * project's copy comes from the mockups and the two must never drift. */
const PRIVACY_NOTE =
  "Rasm tekshirish uchun serverga yuboriladi va darhol o'chiriladi. Hech qayerda saqlanmaydi.";

const NO_MATCH_NOTE = "Topilmadi. Yana bir marta urinib ko'ring.";
const OFFLINE_NOTE = "Internetga ulanib bo'lmadi.";

/** Gemini can be slow but must not be allowed to hang forever with a spinner
 * on screen at 5am — past this, it's treated the same as unreachable. */
const REQUEST_TIMEOUT_MS = 20_000;

type ScanState = 'idle' | 'sending' | 'no-match' | 'offline' | 'match';

/**
 * The Fajr scan.
 *
 * The detection is REAL: the frame is uploaded to our own server, which asks
 * Gemini one yes/no question and relays a bare `{ match }` back. A
 * successful match is what actually silences the alarm — `ringing.tsx`'s
 * ten-second hold is the only other way out, and it is untouched by this
 * screen on purpose. There is deliberately no second escape here: closing
 * this screen with no scan and no held escape must not be possible, or the
 * gate this feature exists to build would be decorative.
 *
 * The app confirms it SAW the object, never that a prayer was performed —
 * that promise from the onboarding copy still holds; only *where* the frame
 * goes has changed, and the copy below says so plainly.
 */
export default function Scan() {
  const insets = useSafeAreaInsets();
  const { settings } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const inFlight = useRef(false);

  const flash = useSharedValue(1);
  const pulseOnce = useCallback(() => {
    flash.set(withSequence(withTiming(0.3, { duration: 110 }), withTiming(1, { duration: 280 })));
  }, [flash]);
  const bracketStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));

  const bracketColor =
    scanState === 'match' ? '#8FBF87' : scanState === 'no-match' || scanState === 'offline' ? '#E8B762' : '#FFFFFF';

  const note =
    scanState === 'no-match' ? NO_MATCH_NOTE : scanState === 'offline' ? OFFLINE_NOTE : PRIVACY_NOTE;

  const takeScan = useCallback(async () => {
    if (inFlight.current || !cameraReady) return;
    const camera = cameraRef.current;
    if (!camera) return;

    inFlight.current = true;
    setScanState('sending');
    pulseOnce();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const photo = await camera.takePictureAsync({ quality: 0.5, base64: true, skipProcessing: true });
      if (!photo.base64) throw new Error('no frame captured');

      const res = await fetch(`${getEnv().apiUrl}/scan`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: photo.base64, target: settings.scanObject }),
        signal: controller.signal,
      });

      // A non-OK response (rate-limited, oversized, malformed) is not "the
      // server is unreachable" -- it answered, just not with a match. Both
      // land the same way: shutter back, never a silent pass.
      const match = res.ok && ((await res.json()) as { match?: boolean }).match === true;

      if (match) {
        setScanState('match');
        pulseOnce();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/alarm/success');
        return;
      }

      setScanState('no-match');
      pulseOnce();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Rural signal at 5am, Gemini timing out, a DNS hiccup -- whatever the
      // cause, this must say so plainly and hand the shutter straight back.
      // Silently passing the scan defeats the whole feature; silently
      // failing it with no explanation leaves someone standing in the dark
      // not knowing whether to keep trying.
      setScanState('offline');
      pulseOnce();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
    }
  }, [cameraReady, pulseOnce, settings.scanObject]);

  if (!permission) return <View style={s.screen} />;

  if (!permission.granted) {
    return (
      <View style={[s.screen, s.center, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={s.askTitle}>Kamera ruxsati kerak</Text>
        <Text style={s.askBody}>
          Signalni to'xtatish uchun buyumni kameraga ko'rsatasiz. {PRIVACY_NOTE}
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
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />

      <View style={[s.overlay, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 26 }]}>
        <Text style={s.title}>{TARGET_LABEL[settings.scanObject]} kadrga oling</Text>

        <View style={s.flex} />

        <Animated.View style={[s.frame, bracketStyle]}>
          <Svg width={240} height={240} viewBox="0 0 240 240">
            <Corner d="M0,28 L0,0 L28,0" color={bracketColor} />
            <Corner d="M212,0 L240,0 L240,28" color={bracketColor} />
            <Corner d="M0,212 L0,240 L28,240" color={bracketColor} />
            <Corner d="M240,212 L240,240 L212,240" color={bracketColor} />
          </Svg>
        </Animated.View>

        <View style={s.flex} />

        <Text style={s.note}>{note}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skanerlash"
          disabled={scanState === 'sending'}
          onPress={takeScan}
          style={s.shutterRing}
        >
          {scanState === 'sending' ? (
            <ActivityIndicator color="#0E0A05" size="small" />
          ) : (
            <View style={s.shutterCore} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Corner({ d, color }: { d: string; color: string }) {
  return <Path d={d} stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />;
}

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#0E0A05' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.gutter },
  overlay: { ...FILL, alignItems: 'center', paddingHorizontal: layout.gutter },
  title: { fontFamily: font.extrabold, fontSize: 21, color: '#FFF3DE', textAlign: 'center' },
  frame: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  note: {
    fontFamily: font.medium,
    fontSize: 11.5,
    lineHeight: 17,
    color: 'rgba(255,243,222,.65)',
    textAlign: 'center',
    paddingHorizontal: 10,
    minHeight: 34,
  },
  shutterRing: {
    marginTop: 22,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3.5,
    borderColor: 'rgba(255,243,222,.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF3DE' },
  askTitle: { fontFamily: font.extrabold, fontSize: 22, color: '#FFF3DE', textAlign: 'center' },
  askBody: { marginTop: 10, fontFamily: font.medium, fontSize: size.small, lineHeight: 21, color: 'rgba(255,243,222,.6)', textAlign: 'center' },
  askFoot: { alignSelf: 'stretch', marginTop: 26, gap: 8 },
  skip: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontFamily: font.semibold, fontSize: size.small, color: 'rgba(255,243,222,.5)' },
});
