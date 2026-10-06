import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Button } from '../../components/ui';
import { ICONS } from '../../data/icons';
import { useStore } from '../../data/store';
import { Backdrop } from '../../design/Backdrop';
import { color, font, layout, size } from '../../design/tokens';
import { OptionRow, PairCard } from '../../onboarding/Choice';
import { NEEDS_ANSWER, STEPS, type Step } from '../../onboarding/content';
import { Pager, useParallax, usePager, useStagger } from '../../onboarding/Pager';
import {
  FajrStep,
  LanguageStep,
  PaywallStep,
  PermissionStep,
  TimesStep,
  WelcomeStep,
} from '../../onboarding/Steps';

type Answers = Record<string, string[]>;

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const [answers, setAnswers] = useState<Answers>({});
  const [lang, setLang] = useState('uz');
  const [page, setPage] = useState(0);
  const pager = usePager(STEPS.length, setPage);

  const choose = useCallback((step: Step, key: string) => {
    setAnswers((prev) => {
      const had = prev[step.id] ?? [];
      if (step.kind === 'choose' && step.select === 'many') {
        return { ...prev, [step.id]: had.includes(key) ? had.filter((k) => k !== key) : [...had, key] };
      }
      return { ...prev, [step.id]: [key] };
    });
  }, []);

  const finish = useCallback(() => {
    // Carry the answers that actually change app behaviour into settings.
    store.setAnswers(answers);
    store.patchSettings({
      gender: (answers.gender?.[0] as 'man' | 'woman') ?? null,
      madhhab: (answers.madhhab?.[0] as 'hanafi' | 'shafii') ?? 'hanafi',
      scanObject: (answers.scan?.[0] as 'mat' | 'sink' | 'both') ?? 'mat',
    });
    store.finishOnboarding();
    router.replace('/home');
  }, [answers, store]);

  const advance = useCallback(() => {
    const next = page + 1;
    if (next >= STEPS.length) return finish();
    setPage(next);
    pager.goTo(next);
  }, [page, pager, finish]);

  const back = useCallback(() => {
    if (page === 0) return;
    setPage(page - 1);
    pager.goTo(page - 1);
  }, [page, pager]);

  const { progress } = pager;
  const bar = useAnimatedStyle(() => {
    const p = (progress.get() + 1) / STEPS.length;
    return { width: `${Math.min(100, Math.max(0, p * 100))}%` };
  });

  const current = STEPS[page];
  const answered = useMemo(
    () => !NEEDS_ANSWER.has(current.id) || (answers[current.id]?.length ?? 0) > 0,
    [current.id, answers],
  );

  return (
    <View style={s.screen}>
      <Backdrop glow={current.kind === 'welcome' || current.kind === 'language' ? 'full' : 'soft'} />

      <View style={[s.progress, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={back}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Orqaga"
          style={{ opacity: page === 0 ? 0.25 : 1 }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M15 19 8 12l7-7" stroke={color.inkWarm} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <View style={s.track}>
          <Animated.View style={[s.fill, bar]} />
        </View>
        <Text style={s.count}>
          {String(page + 1).padStart(2, '0')} / {STEPS.length}
        </Text>
      </View>

      <Pager
        count={STEPS.length}
        pager={pager}
        render={({ index, progress: p }) => (
          <StepView
            step={STEPS[index]}
            page={index}
            progress={p}
            madhhab={(answers.madhhab?.[0] as 'hanafi' | 'shafii') ?? 'hanafi'}
            lang={lang}
            onLang={setLang}
            chosen={answers[STEPS[index].id] ?? []}
            onChoose={(key) => choose(STEPS[index], key)}
          />
        )}
      />

      <View style={[s.foot, { paddingBottom: insets.bottom + 14 }]}>
        {current.hint ? <Text style={s.hint}>{current.hint}</Text> : null}
        <Button label={current.cta} disabled={!answered} onPress={advance} />
        {current.kind === 'paywall' ? (
          <Pressable accessibilityRole="button" onPress={finish} style={s.skip}>
            <Text style={s.skipText}>Bepul davom etish</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function StepView({
  step,
  page,
  progress,
  chosen,
  onChoose,
  madhhab,
  lang,
  onLang,
}: {
  step: Step;
  page: number;
  progress: SharedValue<number>;
  chosen: string[];
  onChoose: (key: string) => void;
  madhhab: 'hanafi' | 'shafii';
  lang: string;
  onLang: (k: string) => void;
}) {
  // The question drifts more than the body, so the layers separate as the page
  // turns instead of sliding as one flat card.
  const askDrift = useParallax(progress, page, 0.22);
  const bodyDrift = useParallax(progress, page, 0.08);
  const askIn = useStagger(progress, page, 0);
  const noteIn = useStagger(progress, page, 5);

  if (step.kind === 'language')
    return (
      <Animated.View style={[s.flex, bodyDrift]}>
        <LanguageStep value={lang} onChange={onLang} />
      </Animated.View>
    );
  if (step.kind === 'welcome')
    return (
      <Animated.View style={[s.flex, bodyDrift]}>
        <WelcomeStep />
      </Animated.View>
    );
  if (step.kind === 'permission')
    return (
      <Animated.View style={[s.flex, bodyDrift]}>
        <PermissionStep step={step} />
      </Animated.View>
    );
  if (step.kind === 'times')
    return (
      <Animated.View style={[s.flex, bodyDrift]}>
        <TimesStep step={step} madhhab={madhhab} />
      </Animated.View>
    );
  if (step.kind === 'steps')
    return (
      <Animated.View style={[s.flex, bodyDrift]}>
        <FajrStep step={step} />
      </Animated.View>
    );
  if (step.kind === 'paywall')
    return (
      <Animated.View style={[s.flex, bodyDrift]}>
        <PaywallStep />
      </Animated.View>
    );

  return (
    <View style={s.page}>
      <Animated.View style={[s.ask, askDrift, askIn]}>
        <Text style={s.h1}>{step.ask}</Text>
        <Text style={s.why}>{step.why}</Text>
      </Animated.View>

      <Animated.View style={bodyDrift}>
        {step.kind === 'pair' ? (
          <View style={s.pairRow}>
            {step.choices.map((c, i) => (
              <StaggerItem key={c.key} progress={progress} page={page} i={i + 1} grow>
                <PairCard choice={c} selected={chosen.includes(c.key)} onPress={() => onChoose(c.key)} />
              </StaggerItem>
            ))}
          </View>
        ) : (
          <View style={s.rows}>
            {step.choices.map((c, i) => (
              <StaggerItem key={c.key} progress={progress} page={page} i={i + 1}>
                <OptionRow choice={c} selected={chosen.includes(c.key)} onPress={() => onChoose(c.key)} />
              </StaggerItem>
            ))}
          </View>
        )}

        {step.kind === 'pair' && step.note ? (
          <Animated.View style={[s.note, noteIn]}>
            <Image source={ICONS[step.note.icon]} style={s.noteIcon} contentFit="contain" />
            <Text style={s.noteText}>{step.note.text}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

function StaggerItem({
  progress,
  page,
  i,
  grow,
  children,
}: {
  progress: SharedValue<number>;
  page: number;
  i: number;
  /** Pair cards split the row, so their wrapper has to grow too. */
  grow?: boolean;
  children: React.ReactNode;
}) {
  const style = useStagger(progress, page, i);
  return <Animated.View style={[style, grow && s.grow]}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.page },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: layout.gutter, paddingBottom: 10 },
  track: { flex: 1, height: 3, borderRadius: layout.radius.pill, backgroundColor: 'rgba(80,50,15,.12)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: layout.radius.pill, backgroundColor: color.inkWarm },
  count: { fontFamily: font.semibold, fontSize: size.tiny, color: color.inkSoft },

  page: { flex: 1, paddingHorizontal: layout.gutter, paddingTop: 18 },
  ask: { gap: 8, marginBottom: 22 },
  h1: { fontFamily: font.extrabold, fontSize: 25, lineHeight: 31, letterSpacing: -0.5, color: color.ink },
  why: { fontFamily: font.medium, fontSize: size.small, lineHeight: 20, color: color.inkSoft },
  rows: { gap: 10 },
  pairRow: { flexDirection: 'row', gap: 12 },
  note: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', marginTop: 16, padding: 14, borderRadius: layout.radius.md, backgroundColor: 'rgba(80,50,15,.05)' },
  noteIcon: { width: 26, height: 26 },
  noteText: { flex: 1, fontFamily: font.medium, fontSize: size.tiny, lineHeight: 18, color: color.inkSoft },

  foot: { paddingHorizontal: layout.gutter, gap: 10 },
  hint: { textAlign: 'center', fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft },
  skip: { alignItems: 'center', paddingVertical: 6 },
  skipText: { fontFamily: font.semibold, fontSize: size.small, color: color.inkSoft },
});
