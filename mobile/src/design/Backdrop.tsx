/**
 * The page background, ported from design-v3/tokens.css.
 *
 * §4.7 of design-system.md: the page is NOT a flat fill. Three barely-there
 * pastel radials keep the cream from going dead, and the gold glow at the top
 * has NO boundary — it dissolves into the page by ~250pt. Drawing it as a
 * rounded card with an edge is what made an earlier attempt look generic.
 *
 * These are radial gradients, which react-native-linear-gradient cannot do,
 * so they are drawn with react-native-svg.
 */
import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color } from './tokens';

/** How much of the screen the gold glow covers, per tier. */
const GLOW = {
  full: { height: 420, opacity: 1 },
  soft: { height: 320, opacity: 0.72 },
} as const;

export type GlowTier = keyof typeof GLOW | 'none';

/** The three pastel wash spots: [cx%, cy%, rx%, ry%, rgb, alpha]. */
const WASH = [
  [6, 2, 52, 30, '206,214,150', 0.3],
  [98, 34, 48, 26, '198,186,222', 0.26],
  [2, 92, 60, 30, '232,186,192', 0.3],
] as const;

export function Backdrop({ glow = 'soft' }: { glow?: GlowTier }) {
  const { width, height } = useWindowDimensions();
  const g = glow === 'none' ? null : GLOW[glow];

  return (
    // Width/height are explicit rather than relying on absoluteFill alone: an
    // Svg sized only by style can collapse and clip everything inside it, which
    // turns the edgeless glow into a hard-edged box. Gradients likewise carry
    // explicit cx/cy/r instead of leaning on defaults.
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        {WASH.map((w, i) => (
          <RadialGradient key={`w${i}`} id={`w${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={`rgb(${w[4]})`} stopOpacity={w[5]} />
            <Stop offset="1" stopColor={`rgb(${w[4]})`} stopOpacity={0} />
          </RadialGradient>
        ))}
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color.glowPeak} stopOpacity={1} />
          <Stop offset="0.26" stopColor="#EAC079" stopOpacity={1} />
          <Stop offset="0.48" stopColor="#F2D399" stopOpacity={1} />
          <Stop offset="0.70" stopColor={color.glowEdge} stopOpacity={0.85} />
          {/* fading to the page colour, not to black, or the edge greys out */}
          <Stop offset="1" stopColor={color.page} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect width="100%" height="100%" fill={color.page} />

      {g && (
        <Ellipse
          cx={width / 2}
          cy={g.height * 0.4}
          rx={width * 1.2}
          ry={g.height * 0.74}
          fill="url(#glow)"
          opacity={g.opacity}
        />
      )}

      {WASH.map((w, i) => (
        <Ellipse
          key={`e${i}`}
          cx={(w[0] / 100) * width}
          cy={(w[1] / 100) * height}
          rx={(w[2] / 100) * width}
          ry={(w[3] / 100) * height}
          fill={`url(#w${i})`}
        />
      ))}
    </Svg>
  );
}
