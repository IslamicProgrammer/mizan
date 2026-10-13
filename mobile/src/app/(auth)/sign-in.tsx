import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui';
import { signInWithGoogle } from '../../data/auth';
import { Backdrop } from '../../design/Backdrop';
import { color, font, layout, size } from '../../design/tokens';

/**
 * Onboarding explains the product before anyone is asked for an account —
 * this screen only ever follows it, never replaces it. And signing in is a
 * way to keep your history, not a gate on using the app (Review Focus #1):
 * "Hozircha kerak emas" always reaches `/home`, with everything except sync
 * already working with no account at all.
 */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPress = async () => {
    setBusy(true);
    setError(null);
    const err = await signInWithGoogle();
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace('/home');
  };

  return (
    <View style={s.screen}>
      <Backdrop glow="full" />
      <View style={[s.brand, { paddingTop: insets.top + 40 }]}>
        <Image source={require('../../../assets/icon.png')} style={s.mark} contentFit="contain" />
        <Text style={s.word}>Mizan</Text>
        <Text style={s.tag}>Namoz tariximiz hisobingiz bilan birga saqlanadi — telefonni almashtirsangiz ham yo'qolmaydi.</Text>
      </View>

      <View style={[s.foot, { paddingBottom: insets.bottom + 16 }]}>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button label={busy ? 'Kutilmoqda…' : 'Google orqali kirish'} disabled={busy} onPress={onPress} />
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.replace('/home')}
          style={s.skip}
          hitSlop={8}
        >
          <Text style={s.skipText}>Hozircha kerak emas</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.page },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.gutter, gap: 10 },
  mark: { width: 84, height: 84, borderRadius: 26 },
  word: { fontFamily: font.extrabold, fontSize: 31, letterSpacing: -1, color: color.inkWarm },
  tag: { fontFamily: font.medium, fontSize: size.small, color: color.inkSoft, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  foot: { paddingHorizontal: layout.gutter, gap: 12 },
  error: { fontFamily: font.medium, fontSize: size.tiny, color: '#B4472F', textAlign: 'center' },
  skip: { alignItems: 'center', paddingVertical: 6 },
  skipText: { fontFamily: font.semibold, fontSize: size.small, color: color.inkSoft },
});
