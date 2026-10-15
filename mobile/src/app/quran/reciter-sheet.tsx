import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Empty } from '../../components/ui';
import { loadReciters, type Reciter } from '../../data/quran';
import { useStore } from '../../data/store';
import { color, font, layout } from '../../design/tokens';

/** A tick, the same stroke `Chevron` uses, for the reciter already chosen. */
function Check() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M5 13l4 4L19 7" stroke={color.accent} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/**
 * The reciter picker (task 33, Step 4) -- "a reciter picker that remembers
 * the choice". A real sheet (see `quran/_layout.tsx`), not a dropdown, so
 * twelve names have room to read comfortably rather than being crammed into
 * a popover.
 */
export default function ReciterSheet() {
  const { reciter, setReciter } = useStore();
  const [reciters, setReciters] = useState<Reciter[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadReciters().then((r) => alive && setReciters(r));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={s.sheet}>
      <Text style={s.title}>Qoriyni tanlang</Text>

      {reciters === null ? null : reciters.length === 0 ? (
        <Empty icon="book" title="Internet aloqasi yo'q" body="Qorilar ro'yxatini ko'rish uchun internetga ulaning." />
      ) : (
        reciters.map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            onPress={() => {
              setReciter(r.id);
              router.back();
            }}
            style={s.row}
          >
            <View style={s.rowText}>
              <Text style={s.rowTitle}>{r.name}</Text>
              {r.style ? <Text style={s.rowSub}>{r.style}</Text> : null}
            </View>
            {reciter === r.id ? <Check /> : null}
          </Pressable>
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { paddingHorizontal: layout.gutter, paddingTop: 20, paddingBottom: 28, gap: 2 },
  title: { fontFamily: font.extrabold, fontSize: 19, letterSpacing: -0.3, color: color.ink, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: 'rgba(80,50,15,.07)',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.bold, fontSize: 15, color: color.ink },
  rowSub: { fontFamily: font.medium, fontSize: 12, color: color.inkSoft },
});
