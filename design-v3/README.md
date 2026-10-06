# Fajr — design v3

Five screens: `home` · `onboarding` · `scan` · `garden` · `focus`.
Open any `.html` directly in a browser. Renders in `shots/`.

## How this was made

Reference → extract → build. Three separate steps, not one.

1. **Reference:** `refs/deen-muslim-*.png`, supplied by the client.
2. **Extract:** `../design-system.md` — pixel-sampled with PIL, screen measured at
   588px for 390pt (scale 1.508 px/pt). Colours are medians of 12×12px patches;
   type sizes derived from measured cap heights.
3. **Build:** every value pulled from that file. Anything not in it is marked
   `ADAPTED` in the CSS with a reason.

Two earlier attempts skipped step 2 and invented values instead. Both were rejected.

## The four measurements that mattered

| | Measured | Earlier attempts |
|---|---|---|
| Hero numeral weight | **900 Black** | 300 Light |
| Page vs card fill | `#F8F2EA` / `#F6EFE6` — **2–4 units** | 5–7 units + 1px borders |
| Hero | **full-bleed glow, no edge**, peak ~170pt down | rounded gradient card |
| Icons | saturated 3D illustrations | thin monochrome strokes |

Separation between surfaces is **shadow only**. Never a fill difference, never a border.
Getting this wrong is what made the earlier versions read as cheap.

## Files

```
tokens.css          the measured system — every screen imports it
home.html           hero glow, quick grid, peeking prayer row
onboarding.html     one question, option cards
scan.html           camera viewfinder (ADAPTED: dark, see below)
garden.html         streak hero, week strip, day record
focus.html          prayer-time interrupt (ADAPTED: not in reference)
assets/icons/       Fluent Emoji 3D, MIT — see LICENSE-fluent-emoji.txt
shots/              rendered PNGs at 390×844 @2x
```

## Documented deviations

The reference is a concept shot and doesn't cover everything (`design-system.md` §5):

- **`scan.html` is dark.** A viewfinder must be, to show the feed. Everything the app
  draws *on top* keeps the warm language — cream pill, ink-warm type, amber accent.
- **`focus.html` has no reference at all.** Assembled from measured parts: the glow, the
  numeral treatment, the cream pill, the surface card.
- **Selected and current states** don't exist in the reference. Built from the measured
  accent `#E66A43` using the same shadow-only elevation.
- **Primary button** doesn't exist in the reference. Built from measured ink + radius.

## Icons

Microsoft Fluent Emoji, **MIT licensed** — commercial use is fine, attribution kept in
`assets/icons/LICENSE-fluent-emoji.txt`. They match the reference's style closely and are
most of why these screens read as a product rather than a wireframe.

Caveat: they are a public set. Any app using them looks somewhat like any other app using
them. Fine for validating the design; worth commissioning custom ones before launch.

## Generated imagery

`home` and `scan` use generated cutouts instead of CSS shapes:

| Asset | Used on | Source |
|---|---|---|
| `assets/img/mosque-hero.png` | home, behind the numerals | generated → segmented → cropped to domes → bottom faded |
| `assets/img/mat-hero.png` | scan, inside the reticle | generated → segmented → laid into perspective by CSS |

Pipeline: `python3 tools/makeasset.py <slug> "<prompt>" -n 3`

Free and keyless (Pollinations). The watermark strip is cropped before segmentation, so
it never reaches the cutout. Background removal is `rembg` with the **full `u2net`** model
— the lightweight `u2netp` mushes soft-edged subjects into a blob.

**Both assets are cropped to hide AI failure.** The mosque's arcade base was incoherent
smeared detail at 2× zoom, so only the dome cluster ships. The rug is a flat top-down
texture; the floor plane is a CSS `rotateX`, not something the model produced. Anything
generated gets inspected at 2× before it is used — the first three mosque attempts and
the first three mat attempts were all rejected.

Raw picks are kept (`mosque-3.png`, `mat-2.png`) so the crops can be redone.

## Still open

- **No dark mode.** The Fajr alarm at 5am has no reference. Needs its own extraction.
- **No Russian.** Russian strings run 20–40% longer and nothing here has been tested at
  that width.
- **No empty, loading, error or offline states.**
- **iOS reference, Android product.** Tab bar, back behaviour and type scale all shift.
- **Generated assets are placeholders.** They are good enough to judge the design, but
  a real photograph of Uzbek architecture (Registan, Bibi-Khanym, Khast Imam) would mean
  far more to the audience than a generic generated dome.
- **`assets/img` is 1.7 MB** and unoptimised. Needs WebP + @2x/@3x export before shipping.

## Reviewing a change

Plain HTML, no build step. Render the way it will actually look:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=390,844 --virtual-time-budget=9000 \
  --screenshot=shots/home.png \
  "file:///Users/murodjonazamov/Desktop/Fajr%20App/design-v3/home.html"
```

Use `file://` — a local dev server drops image requests inside the render budget and
icons silently fail to load.

Every screen here was rendered and corrected this way. It caught a nested CSS comment
that killed the entire token block, a class collision that swallowed the header title,
two layout overflows, and the icon-loading race. None were visible in the source.
