import { headingOffset, isAligned, isCalibrated, usableHeading } from '../compass';

describe('usableHeading', () => {
  it('prefers trueHeading, the declination-corrected reading', () => {
    expect(usableHeading({ trueHeading: 40, magHeading: 55 })).toBe(40);
  });

  it('falls back to magHeading only when trueHeading is the -1 sentinel for no location permission', () => {
    expect(usableHeading({ trueHeading: -1, magHeading: 55 })).toBe(55);
  });

  it('trusts a trueHeading of 0 -- not every falsy-looking value is the sentinel', () => {
    expect(usableHeading({ trueHeading: 0, magHeading: 55 })).toBe(0);
  });
});

describe('isCalibrated', () => {
  it('treats medium and high accuracy (2, 3) as calibrated', () => {
    expect(isCalibrated(2)).toBe(true);
    expect(isCalibrated(3)).toBe(true);
  });

  it('treats low and no accuracy (1, 0) as not calibrated -- a needle here would be guesswork', () => {
    expect(isCalibrated(1)).toBe(false);
    expect(isCalibrated(0)).toBe(false);
  });
});

describe('headingOffset / isAligned', () => {
  it('is exactly aligned when the heading equals the bearing', () => {
    expect(isAligned(131, 131, 8)).toBe(true);
  });

  it('stays aligned just inside the tolerance', () => {
    expect(isAligned(131, 131 + 7, 8)).toBe(true);
  });

  it('falls out of alignment just outside the tolerance', () => {
    expect(isAligned(131, 131 + 9, 8)).toBe(false);
  });

  it('wraps correctly across the 0/360 boundary', () => {
    // Bearing 5 degrees, heading 358 degrees -- 7 degrees apart the short way.
    expect(isAligned(5, 358, 8)).toBe(true);
    expect(isAligned(5, 340, 8)).toBe(false);
  });

  it('is NOT aligned when the phone faces exactly opposite the bearing', () => {
    // Pins the inverted-comparison bug found while rederiving this: the
    // pre-Task-26 screen reported this exact case (200 degrees off) as
    // "Telefon to'g'ri yo'nalishda".
    expect(Math.abs(headingOffset(200, 20))).toBeCloseTo(180, 5);
    expect(isAligned(200, 20, 8)).toBe(false);
  });

  it('is aligned when the phone faces exactly at the bearing', () => {
    expect(headingOffset(200, 200)).toBe(0);
    expect(isAligned(200, 200, 8)).toBe(true);
  });
});
