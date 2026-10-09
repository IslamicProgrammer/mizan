import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '../../design/Backdrop';

import { startFocus, stopFocus } from '../../../modules/app-watch';
import { Button } from '../../components/ui';
import { countdown, currentPrayer, hhmm, nextPrayer, PRAYER_NAMES } from '../../data/prayer';
import { useStore } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

/**
 * What a blocked app shows during prayer time.
 *
 * The app tile is a neutral placeholder on purpose — see focus/apps.tsx.
 */
export default function FocusActive() {
  const insets = useSafeAreaInsets();
  const { settings, addFocusMinutes, blockedApps } = useStore();
  const [now, setNow] = useState(new Date());
  // When this screen was opened, so a genuine completion can bank exactly
  // the time the block was actually in effect.
  const [sessionStart] = useState(() => Date.now());
  // Captured once, at the moment the session starts — not re-read on every
  // tick, or the reminder service would be restarted every second along
  // with it, re-arming the two-dismissals-and-done rule each time.
  const [sessionEndsAt] = useState(() => nextPrayer(new Date(), settings.madhhab).slot.at.getTime());
  const [focusMinutes, setFocusMinutes] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      setFocusMinutes(Math.floor((Date.now() - sessionStart) / 60_000));
    }, 1000);
    return () => clearInterval(t);
  }, [sessionStart]);

  useEffect(() => {
    startFocus(blockedApps, sessionEndsAt);
    // Every exit from this screen -- the genuine `complete()` path, "5
    // daqiqa kutish", and "bugunga fokusni o'chirish" -- calls
    // `router.back()`, which unmounts this component. Stopping
    // unconditionally here, rather than only alongside `complete()`, is
    // what keeps an abandoned session from leaving the user with a
    // notification they cannot dismiss.
    return () => stopFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = currentPrayer(now, settings.madhhab);
  const next = nextPrayer(now, settings.madhhab);
  const left = countdown(next.until);

  // The only genuine completion: the user prayed and the block ends on its
  // own account. Waiting five minutes or switching focus off for the day
  // are both the session ending without having been kept — not focus time.
  const complete = () => {
    addFocusMinutes(focusMinutes);
    router.back();
  };

  return (
    <View style={s.screen}>
      <Backdrop glow="full" />
      <View style={[s.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <View style={s.badge}>
        <Text style={s.badgeText}>{PRAYER_NAMES[cur].toUpperCase()} VAQTI</Text>
      </View>

      <View style={[s.tile, lift.low]} />
      <Text style={s.appName}>Instagram</Text>
      <Text style={s.appSub}>{PRAYER_NAMES[cur]} tugaguncha yopiq</Text>

      <Text style={s.count}>
        {left.h > 0 ? `${left.h}` : String(left.m).padStart(2, '0')}
        <Text style={s.colon}>:</Text>
        {left.h > 0 ? String(left.m).padStart(2, '0') : String(left.s).padStart(2, '0')}
      </Text>
      <Text style={s.countSub}>{left.h > 0 ? 'soat qoldi' : 'daqiqa qoldi'}</Text>

      <View style={s.track}>
        <View style={[s.fill, { width: '38%' }]} />
      </View>
      <View style={s.ends}>
        <Text style={s.endText}>{hhmm(now)}</Text>
        <Text style={s.endText}>{hhmm(next.slot.at)}</Text>
      </View>

      <View style={s.note}>
        <Text style={s.noteText}>
          Fokus rejimini <Text style={s.noteBold}>siz</Text> yoqqansiz. Istalgan vaqtda
          to'xtatasiz — bu qulf emas, eslatma.
        </Text>
      </View>

      <View style={s.flex} />

      <View style={s.foot}>
        <Button label={`${PRAYER_NAMES[cur]}ni o'qidim`} onPress={complete} />
        <Button label="5 daqiqa kutish" tone="ghost" onPress={() => router.back()} />
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={s.off}>
          <Text style={s.offText}>bugunga fokusni o'chirish</Text>
        </Pressable>
      </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.page },
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: layout.gutter },
  badge: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,253,247,.8)' },
  badgeText: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: color.inkWarm },
  tile: { width: 64, height: 64, borderRadius: 15, backgroundColor: '#B3A188', marginTop: 26 },
  appName: { marginTop: 12, fontFamily: font.extrabold, fontSize: 25, letterSpacing: -0.5, color: color.ink },
  appSub: { fontFamily: font.medium, fontSize: 14, color: color.inkSoft, marginTop: 2 },
  count: { marginTop: 18, fontFamily: font.black, fontSize: 68, lineHeight: 76, letterSpacing: -2.5, color: color.inkWarm, fontVariant: ['tabular-nums'] },
  colon: { color: 'rgba(80,50,15,.4)' },
  countSub: { fontFamily: font.medium, fontSize: size.small, color: color.inkSoft, marginTop: -2 },
  track: { alignSelf: 'stretch', height: 6, borderRadius: 999, backgroundColor: 'rgba(80,50,15,.10)', marginTop: 20, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: color.inkWarm },
  ends: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  endText: { fontFamily: font.semibold, fontSize: 11.5, color: color.inkSoft },
  note: { marginTop: 18, padding: 14, borderRadius: layout.radius.md, backgroundColor: 'rgba(80,50,15,.05)' },
  noteText: { fontFamily: font.medium, fontSize: size.tiny, lineHeight: 18, color: color.inkSoft, textAlign: 'center' },
  noteBold: { fontFamily: font.bold, color: color.ink },
  foot: { alignSelf: 'stretch', gap: 9 },
  off: { alignItems: 'center', paddingVertical: 4 },
  offText: { fontFamily: font.medium, fontSize: 11.5, color: color.inkSoft },
});
