/**
 * The one line `focus/apps.tsx` prints under "Sinov rejimi" -- the field
 * report this exists for was "this blocking is not working at all", filed
 * with nothing else to go on because the screen's only feedback was a
 * switch that moves. Every piece here is a thing that can independently be
 * the reason nothing happens: usage access, the overlay permission,
 * whether the native service is actually running, and how many packages
 * were even chosen to block (a toggle flipped on with an empty list is a
 * session that, correctly, watches for nothing).
 *
 * Pure so the exact wording is testable without the native module -- a
 * typo or a swapped ✓/✗ here would otherwise only ever be caught by
 * someone reading Uzbek on a real device.
 */
export function formatBlockDiagnostic(state: {
  usageGranted: boolean;
  overlayGranted: boolean;
  serviceRunning: boolean;
  blockedCount: number;
}): string {
  const mark = (ok: boolean) => (ok ? '✓' : '✗');
  const service = state.serviceRunning ? 'ishlayapti' : 'ishlamayapti';
  return (
    `Ruxsatlar: foydalanish ${mark(state.usageGranted)} · ustidan ${mark(state.overlayGranted)} · ` +
    `xizmat ${service} · ${state.blockedCount} ta ilova bloklangan`
  );
}
