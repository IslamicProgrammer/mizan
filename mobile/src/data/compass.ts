/**
 * Pure heading maths for the qibla compass, kept out of `qibla.tsx` so the
 * one thing Task 26 found actually wrong — declination and calibration,
 * not the bearing itself — can be tested without mounting a screen or
 * touching `expo-location`.
 *
 * `qiblaDegrees()` in `prayer.ts` computes the great-circle bearing from the
 * user's coordinates and was always correct; it is untouched here.
 */

export type HeadingReading = { trueHeading: number; magHeading: number; accuracy: number };

/**
 * `expo-location` sets `trueHeading` to exactly -1 when the OS could not
 * declination-correct it — not a measurement, a sentinel for "no location
 * permission". Falling back to `magHeading` keeps the needle moving, but
 * that reading is magnetic, not true, and is off by Uzbekistan's declination
 * the same way the pre-Task-26 code always was. `isCalibrated` below is what
 * tells the screen it must say so rather than show a confident needle.
 */
export function usableHeading(h: Pick<HeadingReading, 'trueHeading' | 'magHeading'>): number {
  return h.trueHeading !== -1 ? h.trueHeading : h.magHeading;
}

/**
 * iOS documents accuracy 1 ("low") as up to 50 degrees of uncertainty and 2
 * ("medium") as up to 35 — either one is enough to point at the wrong
 * qibla, so only 2 and 3 count as calibrated. Below that, the screen must
 * show the figure-eight prompt instead of claiming alignment.
 */
export function isCalibrated(accuracy: number): boolean {
  return accuracy >= 2;
}

/** Signed difference between the qibla bearing and the phone's own heading
 * (`bearing - heading`), wrapped to (-180, 180] — 0 means the phone is
 * pointed exactly at the qibla. */
export function headingOffset(bearing: number, heading: number): number {
  const target = bearing - heading;
  return ((((target % 360) + 540) % 360) - 180);
}

/**
 * Within `tolerance` degrees of the bearing counts as aligned.
 *
 * The pre-Task-26 screen compared `off > 180 - tolerance` instead of
 * `off < tolerance` — the inverse of what its own "within this many degrees
 * of the bearing" comment said. That reported "Telefon to'g'ri yo'nalishda"
 * when the phone faced exactly away from the qibla, and "aylantiring" when
 * it was already pointed straight at it. Found while re-deriving this for
 * the heading-source fix; corrected here since a confidently backwards
 * indicator is worse than the declination bug Task 26 was opened for.
 */
export function isAligned(bearing: number, heading: number, tolerance: number): boolean {
  return Math.abs(headingOffset(bearing, heading)) < tolerance;
}
