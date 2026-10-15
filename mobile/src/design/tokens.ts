/**
 * Design tokens, ported from design-v3/tokens.css.
 *
 * Every value here traces to design-system.md, which was measured off the
 * reference at 1.508 px/pt. Do not invent values — if something is missing,
 * measure it or add it to the design system first.
 */

export const color = {
  page: '#F8F2EA',
  /**
   * Only 2-4 RGB units from `page`. That is deliberate and it is the single
   * most important rule in this system: cards are separated from the page by
   * SHADOW, never by fill contrast or borders. Darkening this to "make cards
   * visible" is what made three earlier attempts look generic.
   */
  surface: '#F6EFE6',
  glowPeak: '#E8B762',
  glowEdge: '#F9E7C5',
  ink: '#0F0E0C',
  inkWarm: '#50320F',
  inkSoft: '#6B5C46',
  tabOn: '#553111',
  tabOff: '#635E4E',
  accent: '#E66A43',
  hairline: '#EBD2B2',
  pill: '#F4EDDD',
  onDark: '#FFF8EC',
} as const;

export const layout = {
  gutter: 20,
  cardW: 82,
  cardGap: 8,
  radius: { sm: 12, md: 20, lg: 26, xl: 30, pill: 999 },
} as const;

/**
 * The only elevation device, because the fills are effectively identical.
 * iOS takes these directly; Android ignores shadow* and uses `elevation`,
 * which is why both are given.
 */
export const lift = {
  low: {
    shadowColor: '#7A5C30',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  high: {
    shadowColor: '#966E2D',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
} as const;

/** §3: the scale in use. Hero numerals are weight 900 — this was the single
 *  biggest miss in earlier attempts, which used 300. */
export const size = {
  micro: 10,
  tiny: 12,
  small: 13.5,
  body: 16,
  title: 17,
  lead: 20,
  display: 27,
  hero: 78,
} as const;

export const font = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  extrabold: 'Onest_800ExtraBold',
  black: 'Onest_900Black',
  /**
   * Onest has no Arabic glyphs. Quranic text (the daily-ayah card, task 31,
   * and the reader it leads into in task 32) needs a face built for Uthmani
   * diacritics specifically, not whatever Arabic fallback a given device
   * ships -- that differs phone to phone and places the marks wrong. Loaded
   * in `_layout.tsx` beside the Onest weights.
   */
  arabic: 'Amiri_400Regular',
} as const;

/** Motion. One place, so timings stay consistent across every screen. */
export const motion = {
  /** Screen-to-screen and sheet transitions. */
  spring: { damping: 20, stiffness: 180, mass: 1 },
  /** Selections and small state flips — snappier, less overshoot. */
  springTight: { damping: 26, stiffness: 320, mass: 0.8 },
  fast: 180,
  base: 260,
  slow: 420,
} as const;
