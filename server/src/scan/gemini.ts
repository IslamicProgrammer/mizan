export type ScanTarget = 'mat' | 'sink' | 'both';

/**
 * The brief specified `gemini-2.5-flash`. As of this writing Google has
 * retired it — the API now 404s with "no longer available to new users" and
 * points at this model instead. Verified live against the real key in
 * `.secrets/gemini.key` before shipping this, not assumed from training data.
 */
const MODEL = 'gemini-3.8-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * One question, one of two permitted answers, per target. The model is asked
 * for a bare "yes" or "no" and nothing else — a sentence back ("I can see a
 * mat in the corner") must not be mistaken for a match. A false positive here
 * silences the alarm while the person is still in bed, which is the one
 * failure that makes the whole feature pointless.
 */
const QUESTION: Record<ScanTarget, string> = {
  mat: 'Does this photograph contain a prayer mat (janamaz)? Reply with exactly one word: "yes" or "no". No other text.',
  sink: 'Does this photograph contain a bathroom or kitchen sink? Reply with exactly one word: "yes" or "no". No other text.',
  both:
    'Does this photograph contain either a prayer mat (janamaz) or a bathroom/kitchen sink? Reply with exactly one word: "yes" or "no". No other text.',
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

/**
 * Exported so "a sentence is not a match" is directly testable without a
 * network call. Only an exact, trimmed, case-insensitive "yes" counts —
 * anything else, including "no", an empty reply, or a hedge, is a non-match.
 */
export function isBareYes(text: string | undefined): boolean {
  return typeof text === 'string' && text.trim().toLowerCase() === 'yes';
}

/**
 * Calls Gemini once, with the frame and the target's yes/no question. The key
 * goes in the `x-goog-api-key` header rather than the URL's query string, so
 * it never ends up in access logs or a process listing of the outgoing
 * request.
 *
 * Throws on any transport or API failure; the caller (the /scan route)
 * decides what a thrown error means for the phone, because what's safe to do
 * at 5am — never a 500, always leave a way to retry — is a product decision,
 * not this function's.
 */
export async function detectObject(
  image: string,
  target: ScanTarget,
  apiKey: string,
): Promise<boolean> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: QUESTION[target] }, { inlineData: { mimeType: 'image/jpeg', data: image } }],
        },
      ],
      // This model thinks before it answers and that thinking is billed
      // against maxOutputTokens, same as the visible reply. A small budget
      // (the "5" a non-thinking model would need for a bare yes/no) leaves
      // nothing for the actual answer and comes back empty every time —
      // verified live, not assumed. 300 leaves headroom for the thinking
      // tokens plus the one word that matters.
      generationConfig: { temperature: 0, maxOutputTokens: 300 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini responded ${res.status}`);

  const body = (await res.json()) as GeminiResponse;
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  return isBareYes(text);
}
