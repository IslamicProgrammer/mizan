# Design system — extracted from reference

**Source:** `refs/deen-muslim-01.png`, `refs/deen-muslim-02.png` (Deen Muslim concept, iOS).
**Method:** pixel-sampled with PIL. Screen width measured at 588px for a 390pt screen →
**scale 1.508 px/pt**. Colors are medians of 12×12px patches (beats the grain overlay).
Type sizes are derived from measured cap/glyph heights ÷ 0.71 (cap-height ratio for a
geometric sans), so they carry roughly ±1pt of error.

**This file is the source of truth. Nothing gets invented. If a value is needed and is not
here, ask before choosing one.**

---

## 1. Color — measured

| Token | Hex | Where measured |
|---|---|---|
| `page` | `#F8F2EA` | background below hero, left phone |
| `surface` | `#F6EFE6` | quick-actions card, prayer card |
| `glow-peak` | `#E8B762` | hero centre, x≈440px y≈280 |
| `glow-edge` | `#F9E7C5` | hero at screen margin, x≈150 |
| `ink` | `#000000` | darkest pixel in every body/UI string |
| `ink-warm` | `#50320F` | hero numerals `18:36` |
| `ink-tab-on` | `#553111` | active tab label |
| `ink-tab-off` | `#635E4E` | inactive tab label |
| `accent` | `#E66A43` | compass needle, right phone |
| `hairline` | `#EBD2B2` | compass ring stroke |
| `pill` | `#F4EDDD` | "Rotate the phone…" hint pill |

### The finding that matters most

**`page` and `surface` differ by 2–4 RGB units.** They are all but the same colour.
Cards are separated from the page by a *very soft shadow only*, never by fill contrast
and never by a border.

Both previous attempts used 5–7 units of separation plus visible 1px borders. That is
precisely what made them read as cheap. Cards must almost disappear.

---

## 2. Layout — measured

| Value | Measured | Notes |
|---|---|---|
| Screen gutter | **20pt** | left edge 19.2pt, right edge 19.9pt — symmetric |
| Prayer card width | **82pt** | 81.9 / 81.6 / 81.5 / 81.5 across four cards |
| Prayer card gap | **8pt** | 8.0 / 7.3 / 7.7 |
| 5th card peek | **~14pt** | fifth card starts at 376.4pt on a 390pt screen |
| Hero glow centre | **≈200pt from left, ≈170pt from top** | peak R−B at y 380–420px |
| Hero falloff | fades to page by **≈250pt** | no edge — see below |

### The hero has no boundary

Sampled down the left margin, saturation rises from R−B 77 at 105pt to a peak of 104 at
158pt, then decays smoothly to 41 by 248pt. **There is no edge, no radius, no card.** It is
a radial glow that dissolves into the page and bleeds under the status bar.

Previous attempts drew the hero as a 28px-radius gradient card with 20pt margins. Wrong
object entirely.

### Horizontal scroll with deliberate peek

The prayer row is a horizontal scroller. Four cards fit (20 + 4×82 + 3×8 = 372pt) and the
fifth is cut at the screen edge showing ~14pt. The cut is the affordance — there is no
arrow, no dots, no "see all".

---

## 3. Type — measured

Cap/glyph heights measured directly; font size derived.

| Role | Cap H | Size | Weight | Sample |
|---|---|---|---|---|
| Hero numerals | 57.7pt | **~78pt** | **900 Black** | `18:36` |
| Section header | 17.9pt* | **20pt** | 700 Bold | `Prayer Times` |
| Screen title | 11.9pt | **17pt** | 700 Bold, uppercase, ~0.5pt tracking | `DEEN MUSLIM` |
| Inline value | 15.9pt* | **17pt** | 700 Bold | `Magrib 0:53:30` |
| Card value | 11.3pt | **16pt** | 700 Bold | `05:36` |
| Card label | 8.6pt | **12–13pt** | 500 Medium | `Fazar` |
| Micro label | 7.3pt | **10pt** | 500 Medium, uppercase, tracked | `REMAINING TIME` |

\* includes a descender; divided by 0.92 rather than 0.71.

### Scale in use

`10 · 12 · 16 · 17 · 20 · 78`

Not a clean modular ratio — real products rarely have one. What matters is the **jump**:
the hero numeral is **4× the section header** and **7.8× the micro label**. That gap is
most of why the screen reads as designed.

### Weight is the thing I got wrong

**Every weight in the reference is 500 or heavier. There is no light type anywhere.** The
hero numerals are Black (900).

Both previous attempts set the hero at weight 300. A 78pt Light numeral and a 78pt Black
numeral are completely different objects. This single value did more damage than the
palette did.

---

## 4. Structural rules observed

1. **Two surface levels only** — `page` and `surface`. There is no third tier.
2. **No dividers anywhere.** Separation is space and shadow. Not one hairline rule in the UI.
3. **Radius scales with the element.** Container card ≈ 24pt, prayer card ≈ 20pt, pill 999pt,
   hero 0 (full bleed). Radius is not a single global token.
4. **Section headers sit on the page**, left-aligned at the gutter, never inside a card.
5. **Icons are saturated multi-colour illustrations** — purple alarm clock, yellow bulb,
   green folder, red gift. Each has its own hue. They are not monochrome strokes.
6. **Ink is near-black for all body and UI text.** Only the hero numerals (`#50320F`) and the
   active tab (`#553111`) are warm brown.
7. **Background carries grain plus pastel bleed** — green/yellow top, pink lower-left,
   lavender right. The page is not a flat fill.

### Icons — the warmth carrier (was the biggest gap; now closed)

The reference gets much of its warmth from **coloured illustrated icons**. Two early attempts
used thin monochrome stroke SVG, which is why they read as a wireframe rather than a product.
This is an asset problem, not a CSS problem. See §8 for the set that closed it.

---

## 5. What this reference does NOT tell us

Stated so it never gets silently invented:

- **It is a concept shot, not a shipped app.** No empty, loading, error or offline states.
- **No dark mode.** The Fajr alarm at 5am has no reference here.
- **No long strings.** Every label is short and English. Nothing shows how the layout
  survives Russian, which runs 20–40% longer.
- **No scrolled states**, no keyboard, no modals, no lists beyond the Quran surah rows.
- **No motion.** Every value in §3 of any motion spec would be invention.

---

## 6. Open questions — must be answered before building

1. **Icons.** Coloured illustrated icons are central to the reference's quality. Buy a set,
   commission one, or use a free illustrative family? This gates the look.
2. **Display face.** The hero numerals are a heavy geometric sans. Identifying an exact match
   is not possible from a raster. Needs a decision, and it must carry Cyrillic.
3. **Dark mode.** Not in the reference and the product requires it. Derive, or reference
   separately?
4. **Android.** The reference is iOS. Tab bar, back behaviour and type scale all shift.

---

## 7. Brand mark — Mizan

The mark is a Timurid **iwan portal** (the pointed arch of the Registan) with **dawn rising
inside it**. It carries the product in one shape: the arch is the place you pray, the rising
half-disc is Fajr, and the two together sit in balance — *mizan*, the scale.

### Why this and not the obvious options

Four directions were generated and tested at 240 / 48 / 32 / 16px before choosing:

| Direction | Verdict |
|---|---|
| Balance scale | Reads as a child's mobile, not a scale. Gone by 32px. |
| Eight-pointed star | Survives every size, but it is the default Islamic-app icon. Generic. |
| Crescent + disc | Pleasant at size, mushes below 32px. |
| **Pointed arch** | **The only one still legible at 16px, and the only one that is ours.** |

An earlier attempt built the arch from arc geometry and produced something narrow and
spiky. The shipped outline is instead **traced from the chosen reference** by
`tools/trace_icon.py`, which samples the silhouette's edges every 8 units and fits cubics
through them. **Do not "tidy" the arch into a circular arc.** The band is ~51 units thick on
a 512 box; thinning it is what kills the mark at launcher size.

### Geometry (512 box)

| | |
|---|---|
| Tile | 512 square, corner radius 112, fill `#50320F` |
| Mark | `#E8B762`, spans x 85.5–426, y 102.6–409.4 — centred on (256, 256) |
| Band thickness | ~51 units. This is the number that protects small sizes. |
| Dawn disc | semicircle r=96 on the plinth top |
| Plinth | y 354–409.4, full mark width, radius 7 |

### Wordmark

**Mizan**, sentence case, Onest 800, tracking −3 at 112px, cap height 85.3. Optical gap from
the tile's edge to the M is 70. The app's own header uses the same sentence-case form —
the earlier tracked-uppercase `MIZAN` read as a UI label, not a name.

**Caveat:** `logo*.svg` sets the wordmark as live text with an `Onest, Helvetica…` stack, not
outlined paths. It is correct in a browser, where the webfont loads, and falls back to
Helvetica in tools that have no webfont (including `rsvg-convert`, so the exported
`logo-*.png` are Helvetica). Outline the text before sending it to a printer or a
store listing.

### Files

`logos/mizan/` holds the sources; `tools/build_logo.py` derives every other asset from
`icon.svg`, so the mark can only be changed in one place.

- `icon.svg` — the tile. `icon-light.svg`, `icon-mono.svg` — one-colour variants.
- `icon-foreground.svg` + `icon-background.svg` — Android adaptive layers. The foreground
  is the mark scaled into the **66/108 safe zone**; anything outside it can be masked away.
- `logo.svg` / `logo-onbrown.svg` — tile + wordmark. `logo-bare*.svg` — symbol + wordmark,
  no tile; this is the better one for headers and print.
- `export/` — PNGs, 16→1024. `logos/mizan/preview.html` shows the whole set.

---

## 8. Icon set — generated, not borrowed

46 icons in `design-v3/assets/icons/`, generated with Gemini and sliced by
`tools/slice_icons.py`. They replaced a borrowed Microsoft Fluent Emoji set that failed on
two separate counts:

**Colour.** Fluent Emoji are full-spectrum — hot pink hearts, blue droplets, green sprouts,
multicoloured charts. Against a cream/gold/brown page they were the loudest thing on screen.

**Meaning.** Several were simply wrong, and this mattered more:

| Screen | Was | Now |
|---|---|---|
| `03-gender` | 🕌 = "man", ☪️ = "woman" | two human figures, one with a headscarf |
| `07-madhhab` | 📖 for **both** Hanafi and Shafi'i | a post casting a **long** vs **short** shadow |
| `04-practice` | five unrelated icons for a frequency question | a filling ring: full → most → some → sprout → dash |
| `11-scanobject` | 🕌 for a prayer mat | an actual prayer rug, and a tap |
| `settings` | ❤️ for cycle mode | moon phases |
| `focus-home` | 📱 twice, for two different things | deep-focus rings, and an app grid |

The madhhab pair is the one worth keeping: Hanafi and Shafi'i differ on **when Asr begins, by
shadow length**, so the icons now encode the actual distinction instead of decorating it.

### Why they were generated as sheets

**Nine icons per image, one generation pass.** Generating icons one at a time gives each its
own lighting, material and palette, and that drift is exactly what makes a set look bought
rather than designed. A sheet renders all nine under one setup. `logos/iconset/spec.txt` holds
the locked style prefix — reuse it verbatim for any future icon or the set will drift.

### Style contract

Soft matte clay 3D, chunky simplified forms, lit from the upper left, subtle contact shadow.
Palette is closed: gold `#E8B762`, cream `#F8F2EA`, brown `#50320F`, terracotta `#E66A43` as a
sparing accent. **Nothing else.**

### The constraint that governs everything

Icons render at **26–46px** (`.li img` is 28, `.opt img` 34, `.pair img` 46). At that size only
silhouette and two or three value steps survive. Always check a new icon at 28px next to the
others it will sit beside — the first pass of prayer-time icons looked fine individually and
three of them were indistinguishable in a list. `fajr` is gold with a star, `maghrib` is
terracotta, `sunrise` keeps a horizon line where `dhuhr` has none. Those differences exist
only to survive 28px.


---

## 9. Hero imagery — it is a MASK, not a picture

`hero-mosque.png` carries **no colour at all**. It is a white-on-transparent
alpha silhouette, and every screen chooses its own tint and opacity.

Two earlier attempts failed for the same root reason — treating the hero as a
picture when the reference treats it as a mask:

| Attempt | Why it failed |
|---|---|
| Photograph of a marble mosque, colour-keyed | At 22-60% opacity its detail became noise, not atmosphere |
| Flat multi-tone gold illustration | Being DARKER than the glow, it read as a blob behind the numerals |

Look at `refs/deen-muslim-00.png`. The reference hero is a single pale tone
**lighter** than the gold, spanning the full width, with a **small** dome sitting
**below** the numerals and hairline minarets beside them, its base cropped by the
card underneath. Nothing about it is an illustration.

So the asset is generated as **solid black on white** (`logos/iconset/hero-spec.txt`),
and `tools/make_hero.py` converts the black to alpha and fills the RGB white.
A single flat tone by construction cannot go muddy, and the tint becomes a
per-screen decision.

### Where it appears

| Screen | Tint | Opacity | Role |
|---|---|---|---|
| home | `#FFFCF6` | 0.38 | pale ghost, dome below the numerals |
| onboarding welcome | `#FFFCF6` | 0.70 | the screen's hero |
| scan-success | `#E8B762` | 0.30 | warm, low, behind the group |
| alarm-ringing | `#FFFFFF` | 0.20 | silhouette against the night sky |

### The method that found it

Composite candidates over the **real** background at the **real** size and
opacity before choosing. Judging them on white picks the wrong one every time.

And check what the background already contains: three rounds of "tuning" were
wasted compositing test silhouettes on top of a `home.html` render that already
had the old hero baked into it. Render the page with the hero hidden first.

---

## 10. The garden — what it is and what it refuses to be

Each day is a plant and the five prayers make it grow: bare soil → shoot →
leaves → more leaves → bud → flower. Six stages, five prayers.

### What was learned from the apps that do this well

**Forest** grows a tree while you focus and **kills it if you fail**. The dead
tree is the whole mechanic — deliberate loss aversion. Completed trees join a
forest that visualises your history, and new species unlock over time.

**Finch and Duolingo** add what one study of 859 streak designs calls *mercy
infrastructure*: streak freezes, grace days, and repair. Finch does not blank or
cross out a missed day — it shows a hammer you can use to fix it. A streak that
can never be repaired is a bomb set for a bad day.

### The decision

**Forest's loss aversion is rejected outright.** Killing a plant because someone
missed a prayer is wrong, and the product has already said so twice in its own
copy: cycle-mode promises *"Bog'ingiz to'xtab turadi, qurib qolmaydi"* and qaza
says *"Bu qarz daftari emas"*. Nothing in this garden ever withers.

What is taken instead:

| From | Taken | Shape here |
|---|---|---|
| Forest | effort produces a concrete, visible thing | a plant that grows a stage per prayer |
| Forest | history as a collection you can look at | a strip of past days, each its own plant |
| Finch | a missed day is repairable, not shameful | tap the day, make up a qaza prayer, it sprouts |
| Duolingo | lapses must be survivable | rest days pause the streak, never break it |

The repair is **not cosmetic** — it is a real qaza prayer being made up, which
is why the garden is wired to the qaza feature rather than being decoration
beside it.

### Motion

The plant settles with a soft spring, not a pop — it is a plant, not a button.
Stages cross-fade so growth looks continuous rather than like a slideshow, and
the whole plant breathes on a slow sine, anchored at the soil so only the top
moves.

Stage art is cut by `tools/make_plants.py` on a **shared frame** — the union of
all six bounding boxes — so the soil keeps a common baseline and the plant
genuinely appears to grow. Normalising each stage to its own box, which is right
for icons, would scale the seedling and the flower to the same height.
