/**
 * Pure windowing over `focusByDay`, kept out of the screen so the boundary
 * that has been the most recurring defect in this codebase — a window
 * silently sliding to "whichever days happen to have data" instead of a
 * fixed calendar range — can be tested without mounting React. Deliberately
 * not importing from store.tsx: that module pulls in AsyncStorage, which
 * would drag a native dependency into what is otherwise plain date
 * arithmetic.
 */

export type FocusDay = { date: string; minutes: number };

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * The last seven calendar days ending today, oldest first — not the last
 * seven keys present in `focusByDay`. A day with no session in the map is a
 * genuine zero and is included as one; it is only the caller's job to tell
 * "seven real zeroes" apart from "no data at all" (see `hasAnyFocus`).
 */
export function lastSevenDays(focusByDay: Record<string, number>, today: Date): FocusDay[] {
  const out: FocusDay[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = keyOf(d);
    out.push({ date: key, minutes: focusByDay[key] ?? 0 });
  }
  return out;
}

/** True once any focus session has ever been completed — distinguishes a
 * week of real zeroes from an install that has never run a session. */
export function hasAnyFocus(focusByDay: Record<string, number>): boolean {
  return Object.values(focusByDay).some((m) => m > 0);
}
