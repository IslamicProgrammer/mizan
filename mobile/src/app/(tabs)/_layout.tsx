import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { color, font, layout } from '../../design/tokens';

/**
 * The tab bar is drawn by hand rather than themed, because the mockups put it
 * on the page with no bar fill or divider — the icons simply sit on the cream.
 * A default tab bar brings a surface and a hairline that the design does not have.
 */
const ICONS = {
  home: (c: string) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8}>
      <Path d="M4 11 12 4.2 20 11" />
      <Path d="M6.6 9.8V20h10.8V9.8" />
    </Svg>
  ),
  timetable: (c: string) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8}>
      <Circle cx={12} cy={12} r={8.6} />
      <Path d="M12 7.3V12l3.3 2" strokeLinecap="round" />
    </Svg>
  ),
  garden: (c: string) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8}>
      <Path d="M12 20.6V11" />
      <Path d="M12 11C12 7.2 9.3 5.2 5.3 5.2 5.3 9 8 11 12 11z" />
      <Path d="M12 11c0-3.1 2.3-4.8 5.6-4.8C17.6 9.3 15.3 11 12 11z" />
    </Svg>
  ),
  charity: (c: string) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8}>
      <Path d="M12 20.4 4.7 13.2a4.5 4.5 0 1 1 7.3-5.1 4.5 4.5 0 1 1 7.3 5.1z" />
    </Svg>
  ),
} as const;

const TABS = [
  { name: 'home', key: 'home', label: 'Bosh' },
  { name: 'timetable', key: 'timetable', label: 'Vaqtlar' },
  { name: 'garden', key: 'garden', label: "Bog'" },
  { name: 'charity', key: 'charity', label: 'Ehson' },
] as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.page } }}
      tabBar={({ state, navigation }) => (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {TABS.map((t, i) => {
            const active = state.index === i;
            const tint = active ? color.tabOn : color.tabOff;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.label}
                style={styles.tab}
                onPress={() => {
                  if (!active) Haptics.selectionAsync();
                  navigation.navigate(state.routes[i].name);
                }}
              >
                {ICONS[t.key](tint)}
                <Text style={[styles.label, { color: tint }, active && styles.labelOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: layout.gutter / 2,
    backgroundColor: color.page,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.1 },
  labelOn: { fontFamily: font.bold },
});
