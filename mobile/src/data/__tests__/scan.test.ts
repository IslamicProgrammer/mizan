import { MAX_EDGE_PX, outcomeForStatus, resizeTarget } from '../scan';

describe('resizeTarget', () => {
  it('targets width when the longest edge is horizontal', () => {
    expect(resizeTarget(4000, 3000)).toEqual({ width: MAX_EDGE_PX });
  });

  it('targets height when the longest edge is vertical', () => {
    expect(resizeTarget(3000, 4000)).toEqual({ height: MAX_EDGE_PX });
  });

  it('targets width for a square photo (width >= height ties to width)', () => {
    expect(resizeTarget(2000, 2000)).toEqual({ width: MAX_EDGE_PX });
  });

  it('does nothing to a photo already at or under the target -- resizing up would grow the upload', () => {
    expect(resizeTarget(800, 600)).toBeNull();
    expect(resizeTarget(MAX_EDGE_PX, MAX_EDGE_PX)).toBeNull();
  });
});

describe('outcomeForStatus', () => {
  // The bug this exists to prevent: every non-OK response used to be
  // reported as "Internetga ulanib bo'lmadi.", which is exactly what hid a
  // real prayer mat tripping the server's body-size limit from the owner's
  // own description of what went wrong.
  it('maps 413 to "too large", not a generic or offline failure', () => {
    expect(outcomeForStatus(413)).toBe('too-large');
  });

  it('maps 429 to "rate limited"', () => {
    expect(outcomeForStatus(429)).toBe('rate-limited');
  });

  it('maps any other non-OK status to a generic, honest "could not check"', () => {
    expect(outcomeForStatus(400)).toBe('error');
    expect(outcomeForStatus(500)).toBe('error');
    expect(outcomeForStatus(503)).toBe('error');
  });
});
