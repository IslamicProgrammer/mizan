# Fajr — design v2

Five screens: `home` · `onboarding` · `scan` · `garden` · `focus`.
Open any `.html` directly in a browser. Renders in `shots/`.

## The idea

Prayer times are astronomical — all five are defined by where the sun is. So the
app is built as **an instrument that reads the day**, not a list of cards.

One continuous vertical rail runs from Bomdod to Xufton. A live line drawn across
it marks the present moment. Rail above it is lit, below it is dim. The same rail
becomes the record of past days on the garden screen, and the countdown meter on
scan and focus. It is the one structural device, reused everywhere.

## Rules

**One accent.** `--dawn` (#FF9E4F) marks the present moment and nothing else:
the now-line, the next prayer, the active countdown. It never decorates.
`--jade` only ever appears as an 8px dot meaning "prayed".

**Numerals are measurements.** Every time is IBM Plex Mono, tabular. The colon is
dimmed to `--rail-lit` so the digits carry the value — `16:34`, not `16 : 34`.

**Hierarchy comes from type and space, not from fills.** There are no cards.
Options and list rows sit on 1px hairlines. Nothing has a soft grey shadow.

**Bone carries the CTA.** Primary buttons are `--bone` on `--night`, so amber
stays reserved for time.

## Type

| Role | Face |
|---|---|
| Prayer names, questions, labels | **Lora** — serif, Cyrillic ✓ |
| Times, counts, progress | **IBM Plex Mono** — tabular |
| Body, UI | **IBM Plex Sans** |
| Arabic | **Noto Naskh Arabic** |

Lora and IBM Plex both cover Latin and Cyrillic, which Uzbek and Russian require.

## Deliberately not used

All-caps eyebrow labels. Middle-dot meta strings (`A · B · C`). A single uniform
border-radius. Identical rounded cards in a column. Gradient washes as decoration.
Emoji. Fade-and-slide-up on every section.

These are the traits that read as machine-made, per Anthropic's `frontend-design`
skill. The first version of this design hit most of them.

## Motion (for the React Native build)

Animate `transform` and `opacity` only. The one orchestrated moment is the rail:
the now-line slides and the lit portion extends as time passes. Everything else
answers a tap. No ambient motion.

## Reviewing changes

Files are plain HTML with a shared `tokens.css` — no build step. To look at a
change the way it will actually render:

```sh
cd "design-v2" && python3 -m http.server 8788 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=390,844 --virtual-time-budget=4000 \
  --screenshot=shots/home.png "http://127.0.0.1:8788/home.html"
```

Every screen in here was rendered and corrected this way. It caught an overflowing
hero, 200px of dead space, a black halo around the accent dot, and a prayer mat
sitting outside its own viewfinder — none of which were visible in the source.
