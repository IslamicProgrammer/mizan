import { blockWindow, currentPrayer, nextPrayer, timesFor } from '../prayer';

/**
 * `blockWindow` is the one piece of arithmetic `focus/blocked.tsx` shows
 * directly on screen (block-screen.md: "how long is left"). A silent bug
 * here -- an off-by-one on the rounding, or a window that disagrees with
 * `currentPrayer`/`nextPrayer` -- would only ever be caught by someone
 * reading a wrong minute count on a real device, which is exactly the
 * class of bug this file exists to catch instead.
 *
 * A fixed calendar date, not `new Date()`: the whole point is a
 * deterministic window to assert against, and `adhan`'s real Tashkent
 * times for this date are the ground truth `blockWindow` must agree with,
 * not a hand-picked expectation that could drift from the library's own
 * calculation.
 */
const BASE = new Date('2026-03-15T12:00:00+05:00');

describe('blockWindow', () => {
  it('reports the window currentPrayer/nextPrayer already agree is current', () => {
    const w = blockWindow(BASE, 'hanafi');
    expect(w.current).toBe(currentPrayer(BASE, 'hanafi'));
    expect(w.windowEnd).toEqual(nextPrayer(BASE, 'hanafi').slot.at);
    expect(w.windowStart.getTime()).toBeLessThanOrEqual(BASE.getTime());
    expect(w.windowEnd.getTime()).toBeGreaterThan(BASE.getTime());
  });

  it('rounds the minutes left up, never down', () => {
    const next = nextPrayer(BASE, 'hanafi');
    // 90 seconds out -- 1.5 minutes must read as 2, not 1, or the screen
    // would count down to "0 daqiqa qoldi" a full minute before the block
    // actually lifts.
    const ninetySecondsOut = new Date(next.slot.at.getTime() - 90_000);
    expect(blockWindow(ninetySecondsOut, 'hanafi').minutesLeft).toBe(2);

    // Exactly on a whole minute -- no rounding should be introduced where
    // none is needed.
    const exactlyFiveMinutesOut = new Date(next.slot.at.getTime() - 5 * 60_000);
    expect(blockWindow(exactlyFiveMinutesOut, 'hanafi').minutesLeft).toBe(5);
  });

  it("never reports a negative minutesLeft even a moment into the next window", () => {
    const next = nextPrayer(BASE, 'hanafi');
    const justAfter = new Date(next.slot.at.getTime() + 1_000);
    expect(blockWindow(justAfter, 'hanafi').minutesLeft).toBeGreaterThanOrEqual(0);
  });

  it("rolls Isha's window into tomorrow's Fajr, not a dead end at midnight", () => {
    const slots = timesFor(BASE, 'hanafi');
    const isha = slots.find((s) => s.id === 'isha')!;
    const duringIsha = new Date(isha.at.getTime() + 5 * 60_000);

    const w = blockWindow(duringIsha, 'hanafi');
    expect(w.current).toBe('isha');
    expect(w.windowEnd.getTime()).toBeGreaterThan(isha.at.getTime());
    // Tomorrow's Fajr, not today's -- the rollover `nextPrayer` itself does.
    expect(w.windowEnd.getDate()).not.toBe(isha.at.getDate());
  });

  it('agrees with Shafi’i madhhab’s own, earlier Asr window', () => {
    // The madhhab choice genuinely changes Asr (prayer.ts's own doc) -- this
    // is the one place that distinction could silently stop reaching the
    // screen if `blockWindow` ever hardcoded a madhhab instead of taking one.
    const hanafiAsr = timesFor(BASE, 'hanafi').find((s) => s.id === 'asr')!;
    const shafiiAsr = timesFor(BASE, 'shafii').find((s) => s.id === 'asr')!;
    expect(shafiiAsr.at.getTime()).toBeLessThan(hanafiAsr.at.getTime());

    const duringShafiiAsrOnly = new Date(shafiiAsr.at.getTime() + 60_000);
    expect(blockWindow(duringShafiiAsrOnly, 'shafii').current).toBe('asr');
  });
});
