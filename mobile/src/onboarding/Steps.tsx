/**
 * The non-question onboarding steps: language, welcome, permission, time
 * confirmation, the Fajr explainer and the paywall.
 *
 * They share the pager's parallax and stagger so the whole flow feels like one
 * surface rather than a sequence of unrelated screens.
 */
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ICONS } from '../data/icons';
import { hhmm, timesFor, type Madhhab } from '../data/prayer';
import { color, font, layout, lift, size } from '../design/tokens';
import { LANGUAGES, type Step } from './content';

function Tick({ tint = color.inkWarm, px = 18 }: { tint?: string; px?: number }) {
  return (
    <Svg width={px} height={px} viewBox="0 0 24 24">
      <Path d="M20 6 9 17l-5-5" stroke={tint} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function LanguageStep({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  return (
    <View style={s.wrap}>
      <View style={s.brand}>
        <Image source={require('../../assets/icon.png')} style={s.mark} contentFit="contain" />
        <Text style={s.brandWord}>Mizan</Text>
        <Text style={s.brandTag}>Namoz · Fokus · Ehson</Text>
      </View>
      <View style={s.langs}>
        {LANGUAGES.map((l) => {
          const on = l.key === value;
          const soon = l.soon === true;
          return (
            <Pressable
              key={l.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: soon }}
              disabled={soon}
              onPress={() => {
                if (soon) return;
                Haptics.selectionAsync();
                onChange(l.key);
              }}
              style={[s.lang, lift.low, on && s.langOn, soon && s.langSoon]}
            >
              <View style={s.flex}>
                <Text style={s.langTitle}>{l.title}</Text>
                <Text style={s.langSub}>{l.sub}</Text>
              </View>
              <View style={[s.radio, on && s.radioOn]}>{!soon && on ? <Tick tint="#FFF" px={13} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function WelcomeStep() {
  const pillars = [
    { icon: 'alarm', label: "Uyg'oning" },
    { icon: 'shield', label: 'Fokus' },
    { icon: 'gift', label: 'Ehson' },
  ] as const;
  return (
    <View style={[s.wrap, s.center]}>
      <View style={s.shot}>
        <Image
          source={require('../../assets/img/hero-mosque.png')}
          style={s.shotImg}
          contentFit="contain"
          tintColor="#FFFCF6"
        />
      </View>
      <Text style={[s.h1, s.centerText]}>Namozni himoya qiling</Text>
      <Text style={[s.why, s.centerText]}>
        Bomdodga uyg'oning, namoz vaqtida telefonni jim qiling, muntazamlikni ko'ring.
      </Text>
      <View style={s.pillars}>
        {pillars.map((p) => (
          <View key={p.label} style={[s.pillar, lift.low]}>
            <Image source={ICONS[p.icon]} style={s.pillarIcon} contentFit="contain" />
            <Text style={s.pillarLabel}>{p.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PermissionStep({ step }: { step: Extract<Step, { kind: 'permission' }> }) {
  return (
    <View style={[s.wrap, s.center]}>
      <View style={[s.permIcon, lift.high]}>
        <Image source={ICONS[step.icon]} style={s.permIconImg} contentFit="contain" />
      </View>
      <Text style={s.h1}>{step.ask}</Text>
      <Text style={s.why}>{step.why}</Text>
      <View style={s.bullets}>
        {step.bullets.map((b) => (
          <View key={b} style={[s.bullet, lift.low]}>
            <Tick />
            <Text style={s.bulletText}>{b}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TimesStep({ step, madhhab }: { step: Extract<Step, { kind: 'times' }>; madhhab: Madhhab }) {
  const slots = timesFor(new Date(), madhhab);
  return (
    <View style={s.wrap}>
      <Text style={s.h1}>{step.ask}</Text>
      <Text style={s.why}>{step.why}</Text>
      <View style={[s.card, lift.low]}>
        {slots.map((sl, i) => (
          <View key={sl.id} style={[s.timeRow, i > 0 && s.hair]}>
            <Image source={ICONS[sl.icon]} style={s.timeIcon} contentFit="contain" />
            <Text style={s.timeName}>{sl.name}</Text>
            <Text style={s.timeVal}>{hhmm(sl.at)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function FajrStep({ step }: { step: Extract<Step, { kind: 'steps' }> }) {
  return (
    <View style={s.wrap}>
      <Text style={s.h1}>{step.ask}</Text>
      <Text style={s.why}>{step.why}</Text>
      <View style={s.list}>
        {step.items.map((it, i) => (
          <View key={it.key} style={[s.stepRow, lift.low]}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>{i + 1}</Text>
            </View>
            <View style={s.flex}>
              <Text style={s.stepTitle}>{it.title}</Text>
              <Text style={s.stepSub}>{it.sub}</Text>
            </View>
            <Image source={ICONS[it.icon]} style={s.stepIcon} contentFit="contain" />
          </View>
        ))}
      </View>
      <View style={s.note}>
        <Image source={ICONS[step.note.icon]} style={s.noteIcon} contentFit="contain" />
        <Text style={s.noteText}>{step.note.text}</Text>
      </View>
    </View>
  );
}

export function PaywallStep() {
  const perks = [
    "Kengaytirilgan Bomdod signali",
    'Chuqur fokus rejimi',
    "To'liq statistika va qazo hisobi",
  ];
  return (
    <View style={s.wrap}>
      <View style={[s.payHead, lift.high]}>
        <Image source={ICONS.heart} style={s.payIcon} contentFit="contain" />
        <Text style={s.payTitle}>Obunangiz ilovani tirik saqlaydi</Text>
        <Text style={s.paySub}>
          Xarajatlardan keyin qolgan sof foydaning 100% xayriyaga yo'naltiriladi va har oy ochiq
          e'lon qilinadi.
        </Text>
      </View>
      <View style={s.perks}>
        {perks.map((p) => (
          <View key={p} style={s.perk}>
            <Tick px={16} />
            <Text style={s.perkText}>{p}</Text>
          </View>
        ))}
      </View>
      <View style={s.plans}>
        <View style={[s.plan, s.planOn, lift.high]}>
          <View style={s.flex}>
            <Text style={s.planName}>Yillik</Text>
            <Text style={s.planSub}>7 kun bepul, keyin 199 000 so'm/yil</Text>
          </View>
          <View style={s.planRight}>
            <Text style={s.planBadge}>−33%</Text>
            <Text style={s.planPrice}>16 500/oy</Text>
          </View>
        </View>
        <View style={[s.plan, lift.low]}>
          <View style={s.flex}>
            <Text style={s.planName}>Oylik</Text>
            <Text style={s.planSub}>Istalgan vaqtda bekor qilasiz</Text>
          </View>
          <Text style={s.planPrice}>24 900/oy</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flex: 1, paddingHorizontal: layout.gutter, paddingTop: 10 },
  center: { alignItems: 'center' },
  h1: { fontFamily: font.extrabold, fontSize: 25, lineHeight: 31, letterSpacing: -0.5, color: color.ink, textAlign: 'left', alignSelf: 'stretch' },
  why: { marginTop: 8, fontFamily: font.medium, fontSize: size.small, lineHeight: 20, color: color.inkSoft, alignSelf: 'stretch' },

  brand: { alignItems: 'center', paddingTop: 20, gap: 10 },
  mark: { width: 84, height: 84, borderRadius: 26 },
  brandWord: { fontFamily: font.extrabold, fontSize: 31, letterSpacing: -1, color: color.inkWarm },
  brandTag: { fontFamily: font.medium, fontSize: size.small, color: color.inkSoft },
  langs: { marginTop: 30, gap: 10 },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: layout.radius.md, backgroundColor: color.surface },
  langOn: { backgroundColor: '#FBEFE2' },
  langSoon: { opacity: 0.45 },
  langTitle: { fontFamily: font.bold, fontSize: size.body, color: color.ink },
  langSub: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.6, borderColor: '#DFD3BE', alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: color.accent, borderColor: color.accent },

  shot: { height: 230, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  shotImg: { width: 390, height: 218, opacity: 0.7 },
  centerText: { textAlign: 'center' },
  pillars: { flexDirection: 'row', gap: 10, marginTop: 24, alignSelf: 'stretch' },
  pillar: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 16, borderRadius: layout.radius.md, backgroundColor: color.surface },
  pillarIcon: { width: 30, height: 30 },
  pillarLabel: { fontFamily: font.semibold, fontSize: size.tiny, color: color.inkSoft },

  permIcon: { width: 96, height: 96, borderRadius: 32, backgroundColor: '#F6DCA8', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20 },
  permIconImg: { width: 48, height: 48 },
  bullets: { marginTop: 20, gap: 8, alignSelf: 'stretch' },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: layout.radius.md, backgroundColor: color.surface },
  bulletText: { flex: 1, fontFamily: font.semibold, fontSize: 13.5, color: color.ink },

  card: { marginTop: 18, borderRadius: 22, backgroundColor: color.surface, overflow: 'hidden' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12, paddingHorizontal: 16 },
  hair: { borderTopWidth: 1, borderTopColor: 'rgba(80,50,15,.07)' },
  timeIcon: { width: 26, height: 26 },
  timeName: { flex: 1, fontFamily: font.bold, fontSize: 15, color: color.ink },
  timeVal: { fontFamily: font.bold, fontSize: size.body, color: color.ink, fontVariant: ['tabular-nums'] },

  list: { marginTop: 18, gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: layout.radius.md, backgroundColor: color.surface },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F3C87E', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: font.extrabold, fontSize: 13, color: '#40290C' },
  stepTitle: { fontFamily: font.bold, fontSize: 14.5, color: color.ink },
  stepSub: { fontFamily: font.medium, fontSize: size.tiny, lineHeight: 17, color: color.inkSoft, marginTop: 2 },
  stepIcon: { width: 28, height: 28 },
  note: { marginTop: 14, padding: 14, borderRadius: layout.radius.md, backgroundColor: 'rgba(80,50,15,.05)', flexDirection: 'row', gap: 11 },
  noteIcon: { width: 24, height: 24 },
  noteText: { flex: 1, fontFamily: font.medium, fontSize: size.tiny, lineHeight: 18, color: color.inkSoft },

  payHead: { padding: 22, borderRadius: layout.radius.lg, backgroundColor: '#F3C87E', alignItems: 'center', gap: 8 },
  payIcon: { width: 44, height: 44 },
  payTitle: { fontFamily: font.extrabold, fontSize: 21, letterSpacing: -0.4, color: '#40290C', textAlign: 'center' },
  paySub: { fontFamily: font.medium, fontSize: size.tiny, lineHeight: 18, color: '#8A5A11', textAlign: 'center' },
  perks: { marginTop: 16, gap: 9 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkText: { flex: 1, fontFamily: font.semibold, fontSize: 13.5, color: color.ink },
  plans: { marginTop: 16, gap: 10 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: layout.radius.md, backgroundColor: color.surface },
  planOn: { backgroundColor: '#FBEFE2' },
  planName: { fontFamily: font.bold, fontSize: size.body, color: color.ink },
  planSub: { fontFamily: font.medium, fontSize: 11.5, color: color.inkSoft, marginTop: 2 },
  planRight: { alignItems: 'flex-end', gap: 3 },
  planBadge: { fontFamily: font.bold, fontSize: 10.5, color: '#FFF8EC', backgroundColor: color.accent, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, overflow: 'hidden' },
  planPrice: { fontFamily: font.bold, fontSize: 13.5, color: color.ink },
});
