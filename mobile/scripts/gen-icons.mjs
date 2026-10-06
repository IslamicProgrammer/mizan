// Regenerates src/data/icons.ts from whatever is in assets/icons.
import fs from 'node:fs';
const names = fs.readdirSync('assets/icons').filter(f => f.endsWith('.png'))
  .map(f => f.replace(/\.png$/, '')).sort();
fs.writeFileSync('src/data/icons.ts',
`/**
 * The icon set, generated from assets/icons by tools/sync_icons.py.
 * Regenerate this file with \`npm run icons\` after adding an icon.
 */
export const ICONS = {
${names.map(n => `  ${n}: require('../../assets/icons/${n}.png'),`).join('\n')}
} as const;

export type IconKey = keyof typeof ICONS;
`);
console.log(`icons.ts: ${names.length} icons`);
