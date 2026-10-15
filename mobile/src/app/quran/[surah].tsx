import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type ViewToken,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Bar, Empty, IconButton, Note } from '../../components/ui';
import { clampAyah, loadSurahs, loadSurahText, type AyahText, type Surah } from '../../data/quran';
import { loadAyahAudio, useRecitation } from '../../data/recitation';
import { useStore } from '../../data/store';
import { color, font, layout, size } from '../../design/tokens';

/** Mishari Rashid al-`Afasy -- the most widely recognised Murattal
 * recitation, used whenever the picker has never been touched. The reader
 * must never block on a choice before the first tap on play. */
const DEFAULT_RECITER_ID = 7;

function PlayIcon({ playing, tint = color.ink }: { playing: boolean; tint?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill={tint}>
      {playing ? (
        <Path d="M6 5h4v14H6zm8 0h4v14h-4z" />
      ) : (
        <Path d="M7 4.5v15l13-7.5z" />
      )}
    </Svg>
  );
}

export default function SurahReader() {
  const params = useLocalSearchParams<{ surah: string; ayah?: string }>();
  const surahNumber = Number(params.surah);
  const { reciter, reading, setReading } = useStore();
  const recitation = useRecitation();

  const [meta, setMeta] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<AyahText[] | null>(null);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const listRef = useRef<FlatList<AyahText>>(null);
  const didInitialScroll = useRef(false);

  useEffect(() => {
    let alive = true;
    loadSurahs().then((all) => alive && setMeta(all.find((s) => s.number === surahNumber) ?? null));
    loadSurahText(surahNumber).then((a) => alive && setAyahs(a));
    return () => {
      alive = false;
    };
  }, [surahNumber]);

  const startAyah = useMemo(() => {
    const requested = Number(params.ayah ?? reading?.ayah ?? 1);
    return clampAyah(ayahs?.length ?? meta?.ayahCount ?? 1, requested);
  }, [params.ayah, reading, ayahs, meta]);

  const scrollTo = useCallback((ayahNumber: number) => {
    const index = ayahNumber - 1;
    try {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
    } catch {
      // Not yet laid out -- `onScrollToIndexFailed` below retries once it is.
    }
  }, []);

  // Scrolls to the ayah this screen was opened at exactly once, whether that
  // came from the daily-ayah card's deep link or a resumed reading position
  // -- never again on a later re-render, or every store write while reading
  // would yank the list back to where the screen started.
  useEffect(() => {
    if (didInitialScroll.current || !ayahs) return;
    didInitialScroll.current = true;
    if (startAyah > 1) requestAnimationFrame(() => scrollTo(startAyah));
  }, [ayahs, startAyah, scrollTo]);

  // Playback advancing to a new ayah both highlights it and is itself a
  // reading-position change (Step 5) -- someone who presses play and puts
  // the phone away is still "reading", just by ear.
  useEffect(() => {
    if (recitation.ayah === null) return;
    setReading(surahNumber, recitation.ayah);
    scrollTo(recitation.ayah);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recitation.ayah]);

  const effectiveReciter = reciter ?? DEFAULT_RECITER_ID;

  const play = useCallback(
    async (ayahNumber: number) => {
      setAudioNote(null);
      const list = await loadAyahAudio(surahNumber, effectiveReciter);
      if (!list) {
        setAudioNote("Internet aloqasi yo'q — faqat matnni o'qish mumkin.");
        return;
      }
      const startIndex = list.findIndex((a) => a.ayah === ayahNumber);
      recitation.start(list, startIndex >= 0 ? startIndex : 0);
    },
    [surahNumber, effectiveReciter, recitation],
  );

  const onToggleAyah = useCallback(
    (ayahNumber: number) => {
      if (recitation.ayah === ayahNumber) {
        if (recitation.playing) recitation.pause();
        else recitation.resume();
        return;
      }
      play(ayahNumber);
    },
    [recitation, play],
  );

  const onToggleSurah = useCallback(() => {
    if (recitation.ayah !== null) {
      if (recitation.playing) recitation.pause();
      else recitation.resume();
      return;
    }
    play(1);
  }, [recitation, play]);

  // `FlatList` throws ("Changing onViewableItemsChanged on the fly is not
  // supported") the moment this prop's identity changes after mount, so it
  // cannot be a plain `useCallback` closing over `setReading` -- the store
  // hands out a new `setReading` on every state change, which in practice is
  // most renders once anything on this screen is tapped. `setReadingRef` is
  // kept current by the effect below; the callback itself is built exactly
  // once, by `useState`'s lazy initializer, and never touched again.
  const setReadingRef = useRef(setReading);
  useEffect(() => {
    setReadingRef.current = setReading;
  }, [setReading]);
  const lastWrittenAyah = useRef<number | null>(null);
  const [onViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const top = viewableItems[0]?.item as AyahText | undefined;
        if (!top || top.number === lastWrittenAyah.current) return;
        lastWrittenAyah.current = top.number;
        setReadingRef.current(surahNumber, top.number);
      },
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AyahText>) => {
      const active = recitation.ayah === item.number;
      return (
        <View style={[s.ayah, active && s.ayahActive]}>
          <View style={s.ayahHead}>
            <View style={s.badge}>
              <Text style={s.badgeText}>{item.number}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.number}-oyatni tinglash`}
              onPress={() => onToggleAyah(item.number)}
              hitSlop={10}
              style={s.playBtn}
            >
              <PlayIcon playing={active && recitation.playing} tint={active ? color.accent : color.inkSoft} />
            </Pressable>
          </View>
          <Text style={s.arabic}>{item.arabic}</Text>
          <Text style={s.uzbek}>{item.uzbek}</Text>
        </View>
      );
    },
    [recitation.ayah, recitation.playing, onToggleAyah],
  );

  return (
    <View style={s.screen}>
      <Bar
        title={meta?.nameUzbek ?? ''}
        onBack={() => router.back()}
        right={
          <View style={s.headRight}>
            <IconButton label="Qoriyni tanlash" onPress={() => router.push('/quran/reciter-sheet')}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.ink} strokeWidth={2} strokeLinecap="round">
                <Path d="M4 7h16M4 12h10M4 17h13" />
              </Svg>
            </IconButton>
            <IconButton label={recitation.playing ? 'Pauza' : "Surani tinglash"} onPress={onToggleSurah}>
              <PlayIcon playing={recitation.ayah !== null && recitation.playing} />
            </IconButton>
          </View>
        }
      />

      {audioNote ? <Note icon="bell">{audioNote}</Note> : null}

      {ayahs === null ? null : ayahs.length === 0 ? (
        <Empty
          icon="book"
          title="Hali yuklab olinmagan"
          body="Bu surani o'qish uchun birinchi marta internetga ulaning -- shundan keyin oflayn ham o'qiladi."
        />
      ) : (
        <FlatList
          ref={listRef}
          data={ayahs}
          keyExtractor={(item) => String(item.number)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            // A long surah's rows vary in height with ayah length, so the
            // first attempt at a deep scroll can miss before everything
            // below it has ever been measured. One estimated jump, then the
            // real `scrollToIndex`, is the standard fix for a variable-height
            // `FlatList` -- a fixed `getItemLayout` would be exact but would
            // mean asserting a uniform row height this content does not have.
            listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
            requestAnimationFrame(() => scrollTo(index + 1));
          }}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={9}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.page },
  headRight: { flexDirection: 'row', gap: 8 },

  list: { paddingHorizontal: layout.gutter, paddingBottom: 32, gap: 10 },
  ayah: {
    borderRadius: layout.radius.md,
    backgroundColor: color.surface,
    padding: 16,
    gap: 10,
  },
  ayahActive: { backgroundColor: '#F8DFAE' },
  ayahHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(80,50,15,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: font.bold, fontSize: 11.5, color: color.inkWarm, fontVariant: ['tabular-nums'] },
  playBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  arabic: {
    fontFamily: font.arabic,
    fontSize: size.display,
    lineHeight: size.display * 1.9,
    color: color.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  uzbek: { fontFamily: font.medium, fontSize: size.body, lineHeight: 24, color: color.inkWarm },
});
