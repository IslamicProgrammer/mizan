import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Bar, Chevron, Empty, Screen } from '../../components/ui';
import { loadSurahs, readingLabel, type Surah } from '../../data/quran';
import { useStore } from '../../data/store';
import { color, font, layout, lift, size } from '../../design/tokens';

/**
 * The surah list -- the Quran reader's front door (task 33, Step 2). All 114
 * are rendered through a `FlatList` rather than `components/ui`'s `List`:
 * `List` builds one hairline-separated card for every child it is given,
 * which is fine for a settings screen's dozen rows but means mounting all
 * 114 at once here, on exactly the cheap Android phones this app targets.
 */
export default function QuranIndex() {
  const { reading } = useStore();
  const [surahs, setSurahs] = useState<Surah[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadSurahs().then((s) => alive && setSurahs(s));
    return () => {
      alive = false;
    };
  }, []);

  const resumeTo = useCallback(() => {
    if (!reading) return;
    router.push({ pathname: '/quran/[surah]', params: { surah: String(reading.surah), ayah: String(reading.ayah) } });
  }, [reading]);

  const label = surahs ? readingLabel(surahs, reading) : null;

  return (
    <Screen glow="soft" scroll={false} pad={false}>
      <Bar title="Qur'on" onBack={() => router.back()} />

      {label ? (
        <Pressable accessibilityRole="button" onPress={resumeTo} style={[s.resume, lift.low]}>
          <Text style={s.resumeKey}>DAVOM ETISH</Text>
          <Text style={s.resumeLabel}>{label}</Text>
        </Pressable>
      ) : null}

      {surahs === null ? null : surahs.length === 0 ? (
        <Empty
          icon="book"
          title="Internet aloqasi yo'q"
          body="Surahlar ro'yxatini ko'rish uchun birinchi marta internetga ulaning."
        />
      ) : (
        <FlatList
          data={surahs}
          keyExtractor={(item) => String(item.number)}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/quran/[surah]', params: { surah: String(item.number) } })}
              style={[s.row, lift.low]}
            >
              <View style={s.badge}>
                <Text style={s.badgeText}>{item.number}</Text>
              </View>
              <View style={s.rowText}>
                <Text style={s.rowTitle}>{item.nameUzbek}</Text>
                <Text style={s.rowSub}>
                  {item.ayahCount} oyat · {item.revelation === 'meccan' ? 'Makka' : 'Madina'}
                </Text>
              </View>
              <Text style={s.arabic}>{item.nameArabic}</Text>
              <Chevron tint="#C4B29A" />
            </Pressable>
          )}
          // A long surah list on a cheap phone is exactly what `FlatList`'s
          // virtualisation exists for; these three keep the window small
          // without thrashing it on every scroll tick.
          initialNumToRender={16}
          maxToRenderPerBatch={16}
          windowSize={7}
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  resume: {
    marginHorizontal: layout.gutter,
    marginTop: 6,
    marginBottom: 10,
    padding: 16,
    borderRadius: layout.radius.md,
    backgroundColor: '#F3C87E',
    gap: 3,
  },
  resumeKey: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1, color: '#8A5A11' },
  resumeLabel: { fontFamily: font.extrabold, fontSize: size.lead, color: '#40290C' },

  list: { paddingHorizontal: layout.gutter, paddingBottom: 24, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: layout.radius.md,
    backgroundColor: color.surface,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(80,50,15,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: font.bold, fontSize: 12.5, color: color.inkWarm, fontVariant: ['tabular-nums'] },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontFamily: font.bold, fontSize: 15, color: color.ink },
  rowSub: { fontFamily: font.medium, fontSize: size.tiny, color: color.inkSoft },
  arabic: { fontFamily: font.arabic, fontSize: 18, color: color.inkWarm },
});
