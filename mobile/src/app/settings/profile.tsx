import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, Button, Screen, Tiles } from '../../components/ui';
import { getProfile, signInWithGoogle, signOut, useSession, type Profile as GoogleProfile } from '../../data/auth';
import { ICONS } from '../../data/icons';
import { useStore } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

export default function Profile() {
  const { history, keptToday, streak, focusMinutes } = useStore();
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `useSession` only re-reads SecureStore on this component's own mount, so
  // a sign-in or sign-out triggered right here would otherwise show no
  // effect until the screen happens to remount. `null` defers to the hook's
  // own read; a tap sets this directly to the outcome it just caused,
  // which is the one case this screen can know for certain without waiting
  // on anything to re-render it.
  const [signedInOverride, setSignedInOverride] = useState<boolean | null>(null);
  const signedIn = signedInOverride ?? !!session;
  // Same reasoning as `signedInOverride`: a tap that just signed in has
  // already captured the name and photo in SecureStore, but `useSession`
  // will not notice without a remount this screen never gets.
  const [profileOverride, setProfileOverride] = useState<GoogleProfile | null | undefined>(undefined);
  const profile = profileOverride !== undefined ? profileOverride : (session?.profile ?? null);
  // A real, derived total — every prayer this install ever recorded, plus
  // whatever has been kept so far today (today has not reached `history`
  // yet; see store.tsx's roll-over).
  const totalPrayers = Object.values(history).reduce((sum, rec) => sum + rec.kept, 0) + keptToday;

  const onAccountPress = async () => {
    setBusy(true);
    setError(null);
    if (signedIn) {
      await signOut();
      setSignedInOverride(false);
      setProfileOverride(null);
    } else {
      const err = await signInWithGoogle();
      if (err) setError(err);
      else {
        setSignedInOverride(true);
        setProfileOverride(await getProfile());
      }
    }
    setBusy(false);
  };

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Profil" onBack={() => router.back()} />

      <View style={s.head}>
        <View style={[s.avatar, lift.high]}>
          {signedIn && profile?.photo ? (
            // Google's own CDN URL, fetched directly -- Task 28's "keep it
            // local" means we never copy this image to our own storage.
            <Image source={{ uri: profile.photo }} style={s.avatarPhoto} contentFit="cover" />
          ) : (
            <Image source={ICONS.profile} style={s.avatarIcon} contentFit="contain" />
          )}
        </View>
        <Text style={s.name}>
          {signedIn ? profile?.givenName || profile?.name || 'Hisobingiz faol' : 'Hisobga kirish'}
        </Text>
        <Text style={s.joined}>
          {signedIn
            ? 'Namoz tariximiz hisobingizga saqlanadi.'
            : 'Tariximiz saqlanishi uchun hisobga kiring.'}
        </Text>
      </View>

      <View style={s.gap} />
      <Tiles
        items={[
          { value: String(totalPrayers), label: 'namoz' },
          { value: String(streak), label: 'kunlik Bomdod' },
          { value: `${Math.floor(focusMinutes / 60)}s`, label: 'fokus' },
        ]}
      />

      {/* "Hisob" (plan, email, data export, devices) only describes a real
          account beyond this single toggle — out of scope here, same as
          before Task 8. */}

      <View style={s.foot}>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button
          label={busy ? 'Kutilmoqda…' : signedIn ? 'Chiqish' : 'Google orqali kirish'}
          tone={signedIn ? 'ghost' : 'solid'}
          disabled={busy}
          onPress={onAccountPress}
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  gap: { height: 16 },
  head: { alignItems: 'center', paddingTop: 10 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(80,50,15,.08)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarIcon: { width: 36, height: 36 },
  avatarPhoto: { width: 76, height: 76 },
  name: { marginTop: 12, fontFamily: font.extrabold, fontSize: 23, letterSpacing: -0.4, color: color.ink },
  joined: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft, marginTop: 3 },
  foot: { marginTop: 20, marginHorizontal: layout.gutter, gap: 10 },
  error: { fontFamily: font.medium, fontSize: size.tiny, color: '#B4472F', textAlign: 'center' },
});
