/**
 * The Fajr scan's pure decision logic -- split out of `scan.tsx` so the two
 * things that would otherwise fail silently on a phone at 5am (a wrong
 * resize target, a mismapped HTTP status) are checkable without a camera or
 * a server.
 *
 * A patterned prayer mat produces a JPEG several times larger than a plain
 * surface compresses to, and `quality` alone does not bound that -- it is a
 * compression ratio, not a ceiling. `MAX_EDGE_PX` is the actual ceiling:
 * resizing the longest edge down to it before encoding is what keeps the
 * upload predictable regardless of how detailed the scene is, which is the
 * fix; the server's body limit (see `server/src/routes/scan.ts`) is only a
 * second line of defence.
 */
export const MAX_EDGE_PX = 1024;

/**
 * Which `expo-image-manipulator` resize dimension to pass to bring the
 * longest edge down to `MAX_EDGE_PX`, preserving aspect ratio by leaving the
 * other dimension unset (the library computes it). `null` when the photo is
 * already at or under the target -- a camera frame rarely is, but a resize
 * action that enlarges the image would make the upload bigger, not smaller.
 */
export function resizeTarget(
  width: number,
  height: number,
): { width: number } | { height: number } | null {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE_PX) return null;
  return width >= height ? { width: MAX_EDGE_PX } : { height: MAX_EDGE_PX };
}

/** Every state `scan.tsx`'s shutter screen can end up in after a request --
 * `'match'` and `'no-match'` are the server actually answering the
 * question; everything else is the server not answering it, each for a
 * different, honestly-reported reason. */
export type ScanOutcome = 'match' | 'no-match' | 'offline' | 'too-large' | 'rate-limited' | 'error';

/**
 * The old bug: a bare `catch` reported every failure -- a dropped
 * connection, a 413 the server answered with, a 429 -- as the same
 * "no internet" message. That was not merely vague, it was actively
 * misleading for the one case (a prayer mat's larger JPEG) this feature is
 * actually built to detect, and it is what made the field report
 * impossible to diagnose from the owner's description alone.
 *
 * Only reachable for a response that actually came back non-OK; a thrown
 * fetch (aborted, no connection) is `'offline'` and never reaches this.
 */
export function outcomeForStatus(status: number): 'too-large' | 'rate-limited' | 'error' {
  if (status === 413) return 'too-large';
  if (status === 429) return 'rate-limited';
  return 'error';
}

/** What the note under the shutter says for every non-match outcome. */
export const SCAN_NOTE: Record<Exclude<ScanOutcome, 'match'>, string> = {
  'no-match': "Topilmadi. Yana bir marta urinib ko'ring.",
  offline: "Internetga ulanib bo'lmadi.",
  'too-large': "Rasm juda katta. Yana bir marta urinib ko'ring.",
  'rate-limited': 'Biroz kuting va qayta urining.',
  error: "Tekshirib bo'lmadi. Yana urinib ko'ring.",
};
