import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectObject, isBareYes } from '../scan/gemini.js';

describe('isBareYes', () => {
  it('matches a bare "yes"', () => {
    expect(isBareYes('yes')).toBe(true);
  });

  it('matches regardless of case and surrounding whitespace', () => {
    expect(isBareYes(' Yes \n')).toBe(true);
    expect(isBareYes('YES')).toBe(true);
  });

  it('rejects "no"', () => {
    expect(isBareYes('no')).toBe(false);
  });

  it('rejects a sentence, even one that starts with yes', () => {
    // This is the case the whole design is protecting against: a model that
    // answers in prose must never be read as a match.
    expect(isBareYes('Yes, I can see a prayer mat in the corner.')).toBe(false);
  });

  it('rejects an empty or missing reply', () => {
    expect(isBareYes('')).toBe(false);
    expect(isBareYes(undefined)).toBe(false);
  });
});

describe('detectObject', () => {
  const fetchMock = vi.fn();

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('sends the key in the header, never the URL', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'yes' }] } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const match = await detectObject('base64data', 'mat', 'secret-key');

    expect(match).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('secret-key');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('secret-key');
  });

  it('throws on a non-OK response, leaving the caller to decide what that means', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(detectObject('base64data', 'sink', 'secret-key')).rejects.toThrow();
  });
});
