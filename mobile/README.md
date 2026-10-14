# Mizan — mobile

Expo + TypeScript. Prayer and focus app for Uzbekistan.

```bash
npm start           # dev server
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm run doctor      # expo-doctor
npm run smoke       # render every route in headless Chrome (needs `expo start --web`)
npm run smoke:ios   # render on the iOS simulator (needs `expo start` + Expo Go)
npm run compare -- <dir>  # every route beside the mockup it was built from
```

**Run `smoke` before saying anything works.** `tsc`, `lint` and a successful
bundle all pass on code that throws the instant it renders — that is exactly how
an `<Link asChild>` style crash reached a real device. `smoke` mounts each route
through react-native-web and fails on any console error, page error or error
overlay.

`smoke` runs on react-native-web, so it **cannot** see anything native: no
worklet serialization, no native layout. Two real bugs slipped past it — a
worklet capturing a `PanGesture`, and `flex: 1` collapsing a card that
react-native-web laid out correctly. Use `smoke:ios` for those:

```bash
npx expo start > /tmp/expo.log 2>&1 &
LOG=/tmp/expo.log npm run smoke:ios onboarding
```

It deep-links the route into Expo Go on a simulator, screenshots it, and greps
the dev server's own log for client errors. **Read the screenshot** — the log
catches crashes, but a silently wrong layout only shows in the picture.

## Where things live

| Path | What |
|---|---|
| `src/app/index.tsx` | The entry decision: onboarded → `/home`, else `/onboarding`. |
| `src/app/(tabs)/` | The four tabs: home, timetable, garden, charity. |
| `src/app/` | All other routes. Every file here is a screen (Expo Router). |
| `src/components/ui.tsx` | Shared primitives. Build screens from these. |
| `src/data/` | Prayer times (real), store and MOCK data. |
| `src/design/` | Tokens and the shared backdrop. |
| `src/onboarding/` | Onboarding content, pager, step components. |
| `assets/icons/` | Mirrored from `design-v3/assets/icons` by `npm run icons`. |

## Real vs mocked

**Real:** prayer times (`adhan`, pinned to Tashkent), the madhhab actually changing
Asr, the qibla bearing, the live countdowns, the camera preview, and any state you
change — marks, settings and toggles persist and screens agree with each other.

**Mocked** — everything under `MOCK` in `src/data/store.tsx`: history, streaks,
charity figures, the blockable app list, and **the Fajr scan's detection**, which
succeeds on a timer in `app/alarm/scan.tsx`. Each of those is a decision still to
be made, not one already taken.

**The mockups in `../design-v3` are the source of truth for design.** Copy, colour
and icon choices come from there. If something needs to change, change it there
first and re-run the generators, or the two drift apart.

**Run `npm run compare` after building or changing a screen.** It renders every
route beside its mockup. Building from memory of a design is how qibla shipped
with a bare triangle where the mockup has a two-tailed needle, a bearing ring,
cardinal marks, a Kaaba marker and an alignment chip — and how the alarm shipped
flat black where the mockup has a four-stop night-to-dawn sky, a star layer and
two halos. One comparison pass found four screens' worth of that.

Icons and the app logo are both derived, not hand-maintained:

```bash
npm run icons    # icon set -> assets/icons (144px) and regenerates data/icons.ts
npm run images   # hero silhouette + tasbih beads -> assets/img
python3 ../tools/build_logo.py   # logo -> app icon, adaptive layers, splash
```

`hero-mosque.png` is a flat illustration, used on four screens at four
opacities — see `design-system.md` §9. Opacity stays a style prop for that
reason, and no colour adjustment is baked in.

## Decisions worth knowing

**Animations are gesture-driven, not time-driven.** `usePager` exposes a
fractional page index (`progress`) and every moving part reads from it — the
progress bar, the parallax between the question and the options, the staggered
entrance of each row. A half-swipe therefore looks half-done and reverses
cleanly. An entrance built on `useEffect` + `withTiming` cannot do that.

**Shared values use `.get()` / `.set()`, never `.value`.** React Compiler's
`react-hooks/immutability` rule rejects `sv.value = x` as mutating a hook
argument. Reanimated ships `get`/`set` as the compliant API — use it. Do not
silence the rule.

**`usePager` owns both the shared values and the gesture that writes to them.**
Creating them in the hook and mutating them in the component is what triggers
that lint error in the first place.

**A worklet must capture shared values directly, never their container.**
A worklet serializes everything it closes over. Writing `pager.x.get()` inside
`useAnimatedStyle` captures the whole `pager` object — including its
`PanGesture` — and Worklets throws *"Cannot copy value of type `PanGesture`"*.
Destructure first:

```ts
const { x } = pager;                                   // do this
const s = useAnimatedStyle(() => ({ left: x.get() })); // not pager.x.get()
```

This is native-only. `npm run smoke` runs on react-native-web, where there are
no worklets to serialize, so it **cannot** catch this class — only
`npm run smoke:ios` will.

**`<Link asChild>` children take a single, flattened style.** `asChild` clones
the child through Radix's `Slot`, which throws on an array `style`. Use
`StyleSheet.flatten([...])`. The thrown stack points at the route component, not
at the `Link`, so it is easy to misdiagnose.

**Safe-area padding goes on the content, not the route root.** The `Backdrop` is
absolutely positioned, so padding on the root insets it and the gold glow stops
short of the screen edge.

**`<Svg>` needs explicit `width`/`height`.** Sized only by `absoluteFill` it can
collapse and clip its contents, which turns the edgeless glow into a hard-edged
box. Give gradients explicit `cx`/`cy`/`r` too rather than relying on defaults.

**The tasbih bead arc is geometry, not a layout.** Beads ride a circle whose
centre sits `RADIUS` below the apex, so `ARC_CY` must be `ARC_TOP + RADIUS` —
pass a centre smaller than the radius and the whole strand renders above the
screen, which is exactly what happened first time. A large radius flattens the
arc into a dotted line; 400 keeps it reading as beads on a cord.

**The tasbih makes no sound.** A click on every bead is intrusive — counting
happens quietly and often in company — so the haptic alone confirms the tap.
A synthesised click was built and removed for that reason; do not add one back
without asking.

**The tasbih beads are photo-real wood, not coloured circles** (`tools/make_beads.py`,
generated against `logos/iconset/bead-spec.txt`). The specular highlight and the
falloff are what make a bead read as a sphere; a flat disc reads as a dot at any
colour. Three woods — pale maple waiting, dark walnut live, honey amber counted —
cross-fade rather than switch, so a bead passing the centre looks told over
rather than repainted.

**`marks` carries the day it belongs to, and `rollOver` closes out ended days.**
Without `marksDate`, yesterday's marks are still "today" on reopen: the garden
thinks the day is prayed, the streak is wrong, and yesterday never reaches
history. It runs on hydrate AND on app foreground, because an app left open
overnight never cold-starts.

**Touch targets meet 48dp.** The toggle track is 27pt for looks and carries
`hitSlop` to a 49pt target; segment buttons use `minHeight: 44` rather than
padding so the label stays optically centred.

**Text colours are contrast-checked against the page, not eyeballed.** Section
labels are `#7E6A4D` (4.66:1) — the previous `#A08B70` was 2.94:1 and failed.
Accent as TEXT is `#B34422` (5.01:1); raw `color.accent` is 2.90:1 and is only
safe as a background.

**Looping animations respect the OS reduced-motion setting** (`useReducedMotion`,
`ReduceMotion.System`). The alarm keeps its haptic when motion is reduced — it
still has to wake someone.

**Cards are separated by shadow, never by fill.** `color.surface` sits 2–4 RGB
units from `color.page` on purpose. Darkening it to "make cards visible" is the
single change that makes this design look generic — see `design-system.md` §1.

## Not done yet

- Onboarding covers the 6 question steps. Language, welcome, location
  permission, time confirmation, Fajr intro and paywall are designed but not
  built (`design-v3/01,02,08,09,10,12-*.html`).
- No backend. Prayer times, blocking, scan and qaza are all on-device work;
  auth and charity content are the only server surface v1 needs.
- `uz.mizan.app` is a placeholder package name. **It can never be changed once
  the app is published to Google Play** — settle it before the first upload.
- Native modules (camera for the Fajr scan, app blocking) need a development
  build; Expo Go will not run them.
# mizan
