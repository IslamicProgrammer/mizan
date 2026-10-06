/**
 * Charity figures shown on the reports screen.
 *
 * Zero and "no report yet" are facts, not placeholders: the app has not
 * earned anything, so there is nothing to have given away and no report to
 * have published. Update these two constants the day a real monthly report
 * is published — not before.
 */
export const GIVEN_TOTAL = 0;
export const FIRST_REPORT = 'dekabr 2026';

/**
 * A worked example of what a future monthly report will look like, not a
 * real one — every number here is illustrative. The screen that renders it
 * must say so; see charity/report.tsx.
 */
export const SAMPLE_REPORT = {
  month: 'Mart 2027',
  revenue: 4180,
  play: 627,
  infra: 312,
  tax: 498,
  profit: 1743,
  to: [
    { label: 'Oziq-ovqat yordami', org: 'Mehr-shafqat jamg‘armasi · 12-mart', amount: 520, icon: 'gift' },
    { label: 'Toza suv', org: 'Quduq loyihasi · 19-mart', amount: 430, icon: 'droplet' },
    { label: 'Ta’lim', org: 'Maktab jihozlari · 26-mart', amount: 393, icon: 'book' },
  ],
} as const;
