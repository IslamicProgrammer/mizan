import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  appIcon,
  appLabel,
  focusMode,
  goHome,
  notifyDismissed,
  resumeApp,
  snooze,
  stopFocus,
  type BlockMode,
} from '../../../modules/app-watch';
import { Button } from '../../components/ui';
import { Backdrop } from '../../design/Backdrop';
import { blockWindow, hhmm, PRAYER_NAMES } from '../../data/prayer';
import { useStore } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

/**
 * The real block screen (design-v3/focus.html, via block-screen.md) --
 * what `ReminderActivity` deep-links into when a blocked app is opened
 * during a focus session, replacing the generic Android dialog
 * (`activity_reminder.xml`) that used to be the whole feature.
 *
 * Only `pkg` crosses the deep link. Everything else -- the app's label,
 * which prayer is current, how many minutes are left, and which mode the
 * running session is in -- is resolved here, from `prayer.ts` and the
 * native module's own small getters, never passed along precomputed. That
 * is also why the label and the mode are read once into plain `useState`
 * initializers rather than kept in sync with the ticking clock below: both
 * are fixed for the lifetime of this screen (a session's mode cannot
 * change while it runs, and an app's label does not change while this
 * screen is up), and re-reading either every second would just be wasted
 * bridge calls.
 */
export default function FocusBlocked() {
  const insets = useSafeAreaInsets();
  const { settings } = useStore();
  const { pkg: pkgParam } = useLocalSearchParams<{ pkg?: string }>();
  const pkg = pkgParam ?? '';

  const [now, setNow] = useState(new Date());
  const [label] = useState(() => (pkg ? appLabel(pkg) : "noma'lum ilova"));
  const [icon, setIcon] = useState<string | null>(null);
  const [iconFailed, setIconFailed] = useState(false);
  // `focusMode()` reads `FocusService.currentMode`, which defaults to
  // `'remind'` the same way `startFocus` itself does -- see that
  // function's own doc for why that is the safe default rather than this
  // screen inventing a stricter one of its own.
  const [mode] = useState<BlockMode>(focusMode);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!pkg) return;
    // Fetched on a microtask, same reasoning as `focus/apps.tsx`'s own
    // `AppRow`: this screen's first paint lands with the neutral tile
    // before the real icon (a bridge call, not derived React state)
    // arrives, and never inline -- a phone's app icon can be large enough
    // to make synchronous decoding on this exact screen the thing the
    // owner is staring at while it stalls.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setIcon(appIcon(pkg));
      setIconFailed(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pkg]);

  const continueInApp = () => {
    notifyDismissed(pkg);
    resumeApp(pkg);
    if (router.canGoBack()) router.back();
  };

  const wait = () => {
    snooze(pkg);
    resumeApp(pkg);
    if (router.canGoBack()) router.back();
  };

  const turnOffForToday = () => {
    notifyDismissed(pkg);
    stopFocus();
    goHome();
    if (router.canGoBack()) router.back();
  };

  // Lock mode's one guarantee (block-screen.md): there is no path back
  // into the blocked app through Back, so it always goes home here,
  // never the default Activity behaviour of simply closing this screen.
  // Remind mode has no such restriction -- its Back is `Davom etish`,
  // the same explicit resume every other exit from this screen performs,
  // rather than leaning on whatever Android's default back navigation
  // would otherwise do with no task directly behind this one to reveal.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode === 'lock') {
        notifyDismissed(pkg);
        goHome();
      } else {
        continueInApp();
      }
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pkg]);

  const win = blockWindow(now, settings.madhhab);
  const prayerName = PRAYER_NAMES[win.current];
  const showIcon = icon !== null && !iconFailed;

  return (
    <View style={s.screen}>
      <Backdrop glow="full" />
      <View style={[s.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
        <View style={s.badge}>
          <Text style={s.badgeText}>{prayerName.toUpperCase()} VAQTI</Text>
        </View>

        {showIcon ? (
          <Image
            source={{ uri: icon! }}
            style={[s.tile, lift.low]}
            contentFit="cover"
            onError={() => setIconFailed(true)}
          />
        ) : (
          <View style={[s.tile, s.tileFallback, lift.low]}>
            <Text style={s.tileLetter}>{label.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={s.appName} numberOfLines={1}>
          {label}
        </Text>
        <Text style={s.appSub}>{prayerName} tugaguncha yopiq</Text>

        <Text style={s.count}>{win.minutesLeft}</Text>
        <Text style={s.countSub}>daqiqa qoldi</Text>

        <View style={s.track}>
          <View
            style={[
              s.fill,
              { width: `${trackProgress(win.windowStart, win.windowEnd, now)}%` },
            ]}
          />
        </View>
        <View style={s.ends}>
          <Text style={s.endText}>{hhmm(win.windowStart)}</Text>
          <Text style={s.endText}>{hhmm(win.windowEnd)}</Text>
        </View>

        <View style={s.note}>
          <Text style={s.noteText}>
            Fokus rejimini <Text style={s.noteBold}>siz</Text> yoqqansiz. Ikki xil: eslatma yoki
            qulf. O'zingiz tanlaysiz.
          </Text>
        </View>

        <View style={s.flex} />

        <View style={s.foot}>
          <Button label="5 daqiqa kutish" onPress={wait} />
          {mode === 'remind' && (
            <Pressable accessibilityRole="button" onPress={continueInApp} style={s.quiet}>
              <Text style={s.quietText}>Davom etish</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={turnOffForToday} style={s.quiet}>
            <Text style={s.quietText}>bugunga fokusni o'chirish</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** 0-100, clamped -- `now` outside `[windowStart, windowEnd)` (the screen's
 * one-second clock catching up right at a boundary) must never paint the
 * bar past either end. */
function trackProgress(windowStart: Date, windowEnd: Date, now: Date): number {
  const total = windowEnd.getTime() - windowStart.getTime();
  if (total <= 0) return 0;
  const elapsed = now.getTime() - windowStart.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.page },
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: layout.gutter },
  badge: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,253,247,.8)',
  },
  badgeText: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: color.inkWarm },
  tile: { width: 64, height: 64, borderRadius: 15, marginTop: 26 },
  tileFallback: { backgroundColor: '#B3A188', alignItems: 'center', justifyContent: 'center' },
  tileLetter: { fontFamily: font.extrabold, fontSize: 25, color: color.onDark },
  appName: { marginTop: 12, fontFamily: font.extrabold, fontSize: 25, letterSpacing: -0.5, color: color.ink },
  appSub: { fontFamily: font.medium, fontSize: 14, color: color.inkSoft, marginTop: 2 },
  count: {
    marginTop: 18,
    fontFamily: font.black,
    fontSize: size.hero,
    lineHeight: size.hero + 8,
    letterSpacing: -2.5,
    color: color.inkWarm,
    fontVariant: ['tabular-nums'],
  },
  countSub: { fontFamily: font.medium, fontSize: size.small, color: color.inkSoft, marginTop: -2 },
  track: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(80,50,15,.10)',
    marginTop: 20,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999, backgroundColor: color.inkWarm },
  ends: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  endText: { fontFamily: font.semibold, fontSize: 11.5, color: color.inkSoft },
  note: { marginTop: 18, padding: 14, borderRadius: layout.radius.md, backgroundColor: color.surface, ...lift.low },
  noteText: { fontFamily: font.medium, fontSize: size.tiny, lineHeight: 18, color: color.inkSoft, textAlign: 'center' },
  noteBold: { fontFamily: font.bold, color: color.ink },
  foot: { alignSelf: 'stretch', gap: 9 },
  quiet: { alignItems: 'center', paddingVertical: 4 },
  quietText: { fontFamily: font.medium, fontSize: 11.5, color: color.inkSoft },
});
