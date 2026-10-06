/**
 * Render every app route beside the mockup it was built from.
 *
 * The mockups in ../design-v3 are the design source of truth. Building a screen
 * from memory of a mockup is how qibla ended up with a bare triangle where the
 * design has a two-tailed needle, a bearing ring, cardinal marks, a Kaaba
 * marker and an alignment chip. Compare, do not recall.
 *
 * Usage:  node scripts/compare.mjs <outDir>   (needs `expo start --web` on 8081)
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.argv[2];
const MOCKS = path.resolve('../design-v3');

/** route -> the mockup file it must match */
const PAIRS = [
  ['/home', 'home.html'],
  ['/timetable', 'timetable.html'],
  ['/garden', 'garden.html'],
  ['/charity', 'charity-promise.html'],
  ['/month', 'month.html'],
  ['/qaza', 'qaza.html'],
  ['/qibla', 'qibla.html'],
  ['/stats', 'stats.html'],
  ['/settings', 'settings.html'],
  ['/settings/prayer', 'prayer-settings.html'],
  ['/settings/alarm', 'alarm-settings.html'],
  ['/settings/notifications', 'notifications.html'],
  ['/settings/cycle', 'cycle-mode.html'],
  ['/settings/profile', 'profile.html'],
  ['/focus', 'focus-home.html'],
  ['/focus/apps', 'app-picker.html'],
  ['/focus/active', 'focus.html'],
  ['/focus/stats', 'focus-stats.html'],
  ['/alarm/ringing', 'alarm-ringing.html'],
  ['/alarm/success', 'scan-success.html'],
  ['/charity/reports', 'charity-zero.html'],
  ['/charity/report', 'charity-report.html'],
];

const SEED = JSON.stringify({
  onboarded: true,
  settings: {
    madhhab: 'hanafi', gender: 'man', scanObject: 'mat', fajrAlarm: true,
    focusEnabled: true, cycleMode: true, nightTheme: false, notifyBefore: 15,
  },
  marks: { fajr: 'done', sunrise: null, dhuhr: 'done', asr: null, maghrib: null, isha: null },
  answers: {},
});

fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'],
});

for (const [route, mock] of PAIRS) {
  const name = route.replace(/\//g, '_').replace(/^_/, '');

  const m = await browser.newPage();
  await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await m.goto(`file://${path.join(MOCKS, mock)}`, { waitUntil: 'networkidle0', timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 1200));
  await m.screenshot({ path: `${OUT}/${name}.mock.png` });
  await m.close();

  const a = await browser.newPage();
  await a.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await a.evaluateOnNewDocument((s) => {
    try { localStorage.setItem('mizan.state.v1', s); } catch {}
  }, SEED);
  await a.goto(`http://localhost:8081${route}`, { waitUntil: 'networkidle2', timeout: 120_000 });
  await new Promise((r) => setTimeout(r, 2400));
  await a.screenshot({ path: `${OUT}/${name}.app.png` });
  await a.close();

  console.log(`paired ${route}  <->  ${mock}`);
}

await browser.close();
