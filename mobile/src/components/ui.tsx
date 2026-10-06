/**
 * Shared in-app primitives, ported from design-v3/app.css.
 *
 * Every screen is built from these. If a screen needs a one-off style, that is
 * usually a sign the pattern belongs here instead — the mockups reuse a small
 * set of shapes deliberately, and drift between screens is what made earlier
 * attempts look generic.
 */
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop, type GlowTier } from '../design/Backdrop';
import { color, font, layout, lift, motion, size } from '../design/tokens';
import { ICONS, type IconKey } from '../data/icons';

/* ------------------------------------------------------------------ screen */

export function Screen({
  children,
  glow = 'none',
  scroll = true,
  pad = true,
}: {
  children: React.ReactNode;
  glow?: GlowTier;
  scroll?: boolean;
  /** Reserve room under the content for the tab bar. */
  pad?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      style={s.flex}
      contentContainerStyle={{ paddingBottom: (pad ? 86 : 0) + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={s.flex}>{children}</View>
  );

  return (
    <View style={s.screen}>
      <Backdrop glow={glow} />
      <View style={[s.flex, { paddingTop: insets.top }]}>{body}</View>
    </View>
  );
}

/* ------------------------------------------------------------------- chrome */

export function Bar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.bar}>
      {onBack ? (
        <IconButton onPress={onBack} label="Orqaga">
          <Chevron dir="left" />
        </IconButton>
      ) : null}
      <Text style={s.barTitle} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

export function IconButton({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={[s.iconBtn, lift.low]}
    >
      {children}
    </Pressable>
  );
}

export function Chevron({ dir = 'right', tint = color.ink }: { dir?: 'left' | 'right'; tint?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d={dir === 'left' ? 'M15 19 8 12l7-7' : 'M9 5l7 7-7 7'}
        stroke={tint}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function SectionHead({ title, action }: { title: string; action?: string }) {
  return (
    <View style={s.sec}>
      <Text style={s.secTitle}>{title}</Text>
      {action ? <Text style={s.secAction}>{action}</Text> : null}
    </View>
  );
}

/* --------------------------------------------------------------------- list */

/** One card with hairlines inside — never separate cards per row. */
export function List({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[s.list, lift.low, style]}>
      {rows.map((child, i) => (
        <View key={i} style={i > 0 ? s.hair : undefined}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function Row({
  icon,
  title,
  sub,
  value,
  right,
  chevron,
  on,
  dim,
  onPress,
}: {
  icon?: IconKey;
  title: string;
  sub?: string;
  value?: string;
  right?: React.ReactNode;
  chevron?: boolean;
  /** Highlighted (the current prayer, an enabled setting). */
  on?: boolean;
  /** De-emphasised (a pending or inactive item). */
  dim?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <View style={[s.row, on && s.rowOn]}>
      {icon ? <Image source={ICONS[icon]} style={s.rowIcon} contentFit="contain" /> : null}
      <View style={s.rowText}>
        <Text style={[s.rowTitle, on && s.onInk, dim && s.dimInk]} numberOfLines={2}>
          {title}
        </Text>
        {sub ? (
          <Text style={s.rowSub} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={[s.rowValue, on && s.onInk, dim && s.dimValue]}>{value}</Text> : null}
      {right}
      {chevron ? <Chevron tint="#C4B29A" /> : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} android_ripple={{ color: '#00000010' }}>
      {inner}
    </Pressable>
  );
}

/* ---------------------------------------------------------------- controls */

export function Segment({
  options,
  index,
  onChange,
}: {
  options: string[];
  index: number;
  onChange: (i: number) => void;
}) {
  return (
    <View style={s.seg}>
      {options.map((o, i) => (
        <Pressable
          key={o}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === index }}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(i);
          }}
          style={[s.segBtn, i === index && [s.segOn, lift.low]]}
        >
          <Text style={[s.segLabel, i === index && s.segLabelOn]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange?: (v: boolean) => void }) {
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(value ? 19 : 0, motion.springTight) }],
  }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => {
        Haptics.selectionAsync();
        onChange?.(!value);
      }}
      // the track is 27pt tall for looks; hitSlop takes the TARGET to 49pt,
      // which clears Android's 48dp minimum
      hitSlop={{ top: 11, bottom: 11, left: 6, right: 6 }}
      style={[s.tg, value && s.tgOn]}
    >
      <Animated.View style={[s.tgKnob, knob]} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------- stats */

export function Tiles({ items }: { items: { value: string; label: string }[] }) {
  return (
    <View style={s.tiles}>
      {items.map((t) => (
        <View key={t.label} style={[s.tile, lift.low]}>
          <Text style={s.tileValue}>{t.value}</Text>
          <Text style={s.tileLabel}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Bars({ items }: { items: { key: string; pct: number; warn?: boolean }[] }) {
  return (
    <View style={[s.bars, lift.low]}>
      {items.map((b) => (
        <View key={b.key} style={s.br}>
          <Text style={s.brKey}>{b.key}</Text>
          <View style={s.brTrack}>
            <View style={[s.brFill, { width: `${b.pct}%` }, b.warn && s.brWarn]} />
          </View>
          <Text style={[s.brPct, b.warn && s.brPctWarn]}>{b.pct}%</Text>
        </View>
      ))}
    </View>
  );
}

export function Ring({ pct, size: d = 96, stroke = 11 }: { pct: number; size?: number; stroke?: number }) {
  const r = (d - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={d} height={d}>
      <Circle cx={d / 2} cy={d / 2} r={r} stroke="rgba(255,253,247,.55)" strokeWidth={stroke} fill="none" />
      <Circle
        cx={d / 2}
        cy={d / 2}
        r={r}
        stroke="#8A5A11"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        fill="none"
        transform={`rotate(-90 ${d / 2} ${d / 2})`}
      />
    </Svg>
  );
}

/* ----------------------------------------------------------------- buttons */

export function Button({
  label,
  onPress,
  tone = 'solid',
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  tone?: 'solid' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.02 }],
  }));
  return (
    <Animated.View style={[anim, style, disabled && s.disabled]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={() => pressed.set(withSpring(1, motion.springTight))}
        onPressOut={() => pressed.set(withSpring(0, motion.springTight))}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        style={[s.btn, tone === 'solid' ? s.btnSolid : s.btnGhost, tone === 'solid' && lift.high]}
      >
        <Text style={[s.btnLabel, tone === 'ghost' && s.btnLabelGhost]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** The footnote block the mockups use to explain a limit honestly. */
export function Note({ icon, children }: { icon?: IconKey; children: React.ReactNode }) {
  return (
    <View style={s.note}>
      {icon ? <Image source={ICONS[icon]} style={s.noteIcon} contentFit="contain" /> : null}
      <Text style={s.noteText}>{children}</Text>
    </View>
  );
}

/**
 * Empty state. A blank screen tells someone the app is broken; this tells them
 * what the screen is for and what to do next.
 */
export function Empty({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: IconKey;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.empty}>
      <Image source={ICONS[icon]} style={s.emptyIcon} contentFit="contain" />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {action && onAction ? (
        <Button label={action} tone="ghost" onPress={onAction} style={s.emptyBtn} />
      ) : null}
    </View>
  );
}

export function Gap({ h = 14 }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export const text: Record<string, TextStyle> = {
  h1: { fontFamily: font.extrabold, fontSize: 25, letterSpacing: -0.5, color: color.ink },
  body: { fontFamily: font.medium, fontSize: size.small, lineHeight: 20, color: color.inkSoft },
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.page },

  bar: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.gutter,
  },
  barTitle: { flex: 1, fontFamily: font.extrabold, fontSize: 21, letterSpacing: -0.3, color: color.ink },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    marginTop: 20,
    marginBottom: 9,
    marginHorizontal: layout.gutter,
    fontFamily: font.bold,
    fontSize: size.tiny,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#7E6A4D',  // 4.66:1 on page; #A08B70 was 2.94:1 and failed
  },
  sec: {
    marginTop: 18,
    marginHorizontal: layout.gutter,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  secTitle: { flex: 1, fontFamily: font.bold, fontSize: size.lead, letterSpacing: -0.2, color: color.ink },
  secAction: { fontFamily: font.medium, fontSize: size.small, color: '#7A6A54' },

  list: {
    marginHorizontal: layout.gutter,
    borderRadius: 22,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  hair: { borderTopWidth: 1, borderTopColor: 'rgba(80,50,15,.07)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 16 },
  rowOn: { backgroundColor: '#F8DFAE' },
  rowIcon: { width: 28, height: 28 },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontFamily: font.bold, fontSize: 15, color: color.ink },
  rowSub: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft },
  rowValue: { fontFamily: font.bold, fontSize: size.body, color: color.ink, fontVariant: ['tabular-nums'] },
  onInk: { color: '#40290C' },
  dimInk: { color: color.inkSoft, fontFamily: font.semibold },
  dimValue: { color: color.inkSoft, fontFamily: font.semibold, fontSize: 15 },

  seg: {
    marginHorizontal: layout.gutter,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 15,
    backgroundColor: 'rgba(80,50,15,.07)',
  },
  // minHeight, not padding: the label must stay optically centred
  segBtn: { flex: 1, minHeight: 44, justifyContent: 'center', borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: color.page },
  segLabel: { fontFamily: font.semibold, fontSize: size.small, color: color.inkSoft },
  segLabelOn: { fontFamily: font.extrabold, color: color.ink },

  tg: {
    width: 46,
    height: 27,
    borderRadius: layout.radius.pill,
    backgroundColor: 'rgba(80,50,15,.16)',
    padding: 3,
    justifyContent: 'center',
  },
  tgOn: { backgroundColor: color.accent },
  tgKnob: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#FFFCF6' },

  tiles: { marginHorizontal: layout.gutter, flexDirection: 'row', gap: 10 },
  tile: { flex: 1, padding: 15, borderRadius: layout.radius.md, backgroundColor: color.surface, gap: 4 },
  tileValue: {
    fontFamily: font.extrabold,
    fontSize: 25,
    letterSpacing: -0.6,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: { fontFamily: font.semibold, fontSize: 11.5, color: color.inkSoft },

  bars: {
    marginHorizontal: layout.gutter,
    padding: 18,
    borderRadius: 22,
    backgroundColor: color.surface,
    gap: 13,
  },
  br: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brKey: { width: 62, fontFamily: font.bold, fontSize: size.small, color: color.ink },
  brTrack: { flex: 1, height: 11, borderRadius: layout.radius.pill, backgroundColor: 'rgba(80,50,15,.09)' },
  brFill: { height: '100%', borderRadius: layout.radius.pill, backgroundColor: '#7E9B78' },
  brWarn: { backgroundColor: color.accent },
  brPct: {
    width: 40,
    textAlign: 'right',
    fontFamily: font.bold,
    fontSize: 12.5,
    color: '#5F7D59',
    fontVariant: ['tabular-nums'],
  },
  brPctWarn: { color: '#B34422' },  // 5.01:1; raw accent as text is 2.90:1

  btn: { height: 54, borderRadius: layout.radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnSolid: { backgroundColor: color.inkWarm },
  btnGhost: { backgroundColor: color.surface },
  btnLabel: { fontFamily: font.bold, fontSize: size.body, color: color.onDark },
  btnLabelGhost: { color: color.inkWarm },
  disabled: { opacity: 0.4 },

  empty: { alignItems: 'center', paddingHorizontal: layout.gutter + 16, paddingTop: 40, gap: 8 },
  emptyIcon: { width: 56, height: 56, marginBottom: 4 },
  emptyTitle: { fontFamily: font.extrabold, fontSize: 19, letterSpacing: -0.3, color: color.ink, textAlign: 'center' },
  emptyBody: { fontFamily: font.medium, fontSize: size.small, lineHeight: 20, color: color.inkSoft, textAlign: 'center' },
  emptyBtn: { alignSelf: 'stretch', marginTop: 12 },

  note: {
    marginHorizontal: layout.gutter,
    marginTop: 14,
    padding: 14,
    borderRadius: layout.radius.md,
    backgroundColor: 'rgba(80,50,15,.05)',
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
  },
  noteIcon: { width: 26, height: 26 },
  noteText: { flex: 1, fontFamily: font.medium, fontSize: size.tiny, lineHeight: 18, color: color.inkSoft },
});
