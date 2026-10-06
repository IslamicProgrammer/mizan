import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Button } from '../../components/ui';
import { hhmm, timesFor } from '../../data/prayer';
import { useStore } from '../../data/store';
import { color, font, layout, lift, motion, size } from '../../design/tokens';

export default function Success() {
  const insets = useSafeAreaInsets();
  const { settings, setMark } = useStore();
  const slots = timesFor(new Date(), settings.madhhab);
  const fajr = slots[0];
  const sunrise = slots[1];

  const pop = useSharedValue(0);
  useEffect(() => {
    pop.set(withSpring(1, motion.spring));
  }, [pop]);
  const mark = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + pop.get() * 0.4 }], opacity: pop.get() }));

  return (
    <View style={[s.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.body}>
      <Image
        source={require('../../../assets/img/hero-mosque.png')}
        style={s.mosque}
        contentFit="contain"
        tintColor="#E8B762"
        pointerEvents="none"
      />
      <Animated.View style={[s.check, mark]}>
        <Svg width={54} height={54} viewBox="0 0 24 24">
          <Path d="M20 6 9 17l-5-5" stroke="#FBFDF9" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>

      <Text style={s.title}>Joynamoz topildi</Text>
      <Text style={s.sub}>Signal to'xtatildi · {hhmm(new Date())}</Text>

      <View style={[s.window, lift.high]}>
        <Text style={s.windowKey}>BOMDOD VAQTI</Text>
        <Text style={s.windowVal}>
          {hhmm(fajr.at)} — {hhmm(sunrise.at)}
        </Text>
        <Text style={s.windowSub}>Shoshilmang. Vaqt yetarli.</Text>
      </View>
      </View>

      <View style={s.foot}>
        <Button
          label="Bomdodni o'qidim deb belgilash"
          onPress={() => {
            setMark('fajr', 'done');
            router.replace('/home');
          }}
        />
        <Button label="Keyinroq belgilayman" tone="ghost" onPress={() => router.replace('/home')} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.page, paddingHorizontal: layout.gutter },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // behind the whole group, not across the title
  mosque: { position: 'absolute', bottom: -70, left: -20, right: -20, height: 218, opacity: 0.30 },
  check: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#7E9B78', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 22, fontFamily: font.extrabold, fontSize: 26, letterSpacing: -0.5, color: color.ink },
  sub: { marginTop: 6, fontFamily: font.medium, fontSize: size.small, color: color.inkSoft },
  window: { marginTop: 26, alignSelf: 'stretch', padding: 20, borderRadius: layout.radius.lg, backgroundColor: '#F3C87E', alignItems: 'center' },
  windowKey: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.2, color: '#8A5A11' },
  windowVal: { marginTop: 6, fontFamily: font.black, fontSize: 30, letterSpacing: -1, color: '#40290C', fontVariant: ['tabular-nums'] },
  windowSub: { marginTop: 4, fontFamily: font.medium, fontSize: size.tiny, color: '#8A5A11' },
  foot: { alignSelf: 'stretch', gap: 10 },
});
