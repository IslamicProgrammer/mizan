/**
 * Render smoke test.
 *
 * `tsc`, `expo lint` and a successful bundle all pass on code that throws the
 * moment it renders — that is how the `<Slot>` array-style error reached a real
 * device. This actually mounts every route through react-native-web in headless
 * Chrome and fails on any console error, page error, or error-overlay text.
 *
 * It is a smoke test, not a substitute for a device: react-native-web does not
 * exercise native gesture, haptic or layout behaviour. It catches the large
 * class of "component blew up on mount" bugs, which is the class that wastes
 * the most time.
 *
 * Usage:  node scripts/smoke.mjs [baseUrl]   (default http://localhost:8081)
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:8081';
const ROUTES = [
  '/', '/home', '/onboarding', '/timetable', '/garden', '/charity',
  '/month', '/qaza', '/qibla', '/stats', '/tasbih',
  '/settings', '/settings/prayer', '/settings/alarm',
  '/settings/notifications', '/settings/cycle', '/settings/profile',
  '/focus', '/focus/apps', '/focus/active', '/focus/stats',
  '/alarm/ringing', '/alarm/success',
  '/charity/reports', '/charity/report',
];
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Noise that is expected in a web dev bundle and says nothing about our code. */
const IGNORE = [
  /Download the React DevTools/i,
  /useNativeDriver/i,
  /\[Fast Refresh\]/i,
  /source map/i,
  /Deprecation/i,
  /findDOMNode/i,
  /ReactNativeFiberHostComponent/i,
  /"shadow\*" style props are deprecated/i,
  /props\.pointerEvents is deprecated/i,
  /Image: style\.resizeMode/i,
  // Chrome refuses navigator.vibrate before the page has been tapped. That is
  // browser policy meeting expo-haptics, not a fault in the screen.
  /Blocked call to navigator\.vibrate/i,
];
const noisy = (t) => IGNORE.some((r) => r.test(t));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=420,900'],
});

let failed = 0;

for (const route of ROUTES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 900 });
  const problems = [];

  page.on('console', (m) => {
    if (m.type() === 'error' && !noisy(m.text())) problems.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => {
    if (!noisy(String(e.message))) problems.push(`pageerror: ${e.message}`);
  });

  try {
    await page.goto(`${BASE}${route}`, {
      waitUntil: 'networkidle2',
      timeout: 180_000,
    });
    // give the bundle time to mount and any error overlay time to appear
    await new Promise((r) => setTimeout(r, 2200));

    // React Native Web surfaces render failures as visible overlay text
    const overlay = await page.evaluate(() => {
      const body = document.body?.innerText ?? '';
      const hit = body.match(/(Render Error|Unhandled|Uncaught|Error:)[^\n]{0,180}/);
      return hit ? hit[0] : null;
    });
    if (overlay) problems.push(`overlay: ${overlay}`);

    // a route that mounted nothing is also a failure
    const painted = await page.evaluate(
      () => (document.querySelector('#root')?.childElementCount ?? 0) > 0,
    );
    if (!painted) problems.push('nothing rendered into #root');
  } catch (e) {
    problems.push(`navigation: ${e.message}`);
  }

  if (problems.length) {
    failed++;
    console.log(`FAIL  ${route}`);
    for (const p of problems.slice(0, 6)) console.log(`      ${p}`);
  } else {
    console.log(`ok    ${route}`);
  }
  await page.close();
}

await browser.close();
console.log(failed ? `\n${failed} route(s) failed` : '\nall routes rendered');
process.exit(failed ? 1 : 0);
