import { formatBlockDiagnostic } from '../focusDiagnostic';

describe('formatBlockDiagnostic', () => {
  it('reports every permission granted, the service running, and a count', () => {
    expect(
      formatBlockDiagnostic({
        usageGranted: true,
        overlayGranted: true,
        serviceRunning: true,
        blockedCount: 3,
      }),
    ).toBe('Ruxsatlar: foydalanish ✓ · ustidan ✓ · xizmat ishlayapti · 3 ta ilova bloklangan');
  });

  it('reports a missing permission and a service that is not running', () => {
    expect(
      formatBlockDiagnostic({
        usageGranted: true,
        overlayGranted: false,
        serviceRunning: false,
        blockedCount: 0,
      }),
    ).toBe('Ruxsatlar: foydalanish ✓ · ustidan ✗ · xizmat ishlamayapti · 0 ta ilova bloklangan');
  });

  it('reports usage access missing independently of the other three', () => {
    const line = formatBlockDiagnostic({
      usageGranted: false,
      overlayGranted: true,
      serviceRunning: true,
      blockedCount: 1,
    });
    expect(line).toContain('foydalanish ✗');
    expect(line).toContain('ustidan ✓');
  });
});
