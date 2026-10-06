# Design Prompt — Fajr (Prayer & Focus App)

> Paste everything below into a fresh Claude conversation. It is self-contained.

---

## Your role

You are designing the complete visual system and screen designs for **Fajr**, an Android-first Muslim prayer and focus app launching in Uzbekistan. I need a cohesive, production-ready design system followed by high-fidelity screen designs.

Deliver as **interactive HTML artifacts at phone dimensions (390×844)**, using real CSS — not images, not descriptions. Every screen must be something I can look at and immediately understand how to build in React Native.

---

## The product in one line

A prayer companion that helps Muslims wake up for Fajr, protect prayer time from their phone, build consistency, and give back — 100% of net profit goes to charity, publicly reported.

## Who it is for

Muslims in Uzbekistan, ages roughly 18–40, on mid-range Android phones. Many are trying to become more consistent in prayer rather than already perfect at it. They are not looking to be judged, gamified, or lectured. The app must feel like a calm, respectful companion — closer to a well-made meditation app than to a fitness tracker.

Trilingual: **Uzbek (primary), Russian, English.**

---

## Visual direction: warm cream & amber-gold

This is the agreed direction. Hold it consistently.

- **Mood:** warm, calm, inviting. Soft and generous rather than clinical. The app should feel like early light through a window, not a notification.
- **Palette:** cream and sand as the ground, amber-gold as the accent, deep warm brown as the text color. Concrete tokens:
  - Screen background `#FFFCF6`, card `#FBF5EA`, subtle chip `#F4EBDB`, hairline `#F1E7D6`
  - Text `#3B2A17`, secondary `#8A7660`, tertiary `#9A8974`
  - Signature gradient `#FCE7BC → #F5CB80 → #EAA945`; amber text-on-light `#A0620F`
  - Supporting hues: sage `#7E9B78` (completed), violet `#5C4A75` (focus), rose `#9E5757` (charity & cycle)
- **Critical contrast rule:** text on the gold gradient is **dark brown**, never white. White on amber fails accessibility badly.
- **Signature element:** the background gradient **shifts with time of day**, tracking the prayer cycle — amber and cream at dawn and midday, deeper gold at Asr, violet-indigo at Maghrib, warm near-black at Isha. The phone quietly reflects where the sun is. Design each screen at the time of day it is most often seen.
- **Shape language:** generously rounded. Cards 20–28px radius, pill buttons, soft icon tiles at 12–20px radius. Shadows are warm-tinted and diffuse, never gray.
- **Typography:** large, confident, generous. Prayer times are the hero — big enough to read across a dark room at 5am. Lots of whitespace.
- **Motion:** slow and physical. Spring-based, 300–600ms, ease-out. Things settle rather than bounce. No confetti, no celebration explosions.
- **Mosque geometry** as a soft silhouette behind the hero gradient is welcome — simple arches and minarets at low opacity. **Avoid:** detailed clipart, crescent-moon stock icons, gold filigree borders, busy geometric patterns as wallpaper.

### Hard typography constraint

The typeface must support **Latin AND Cyrillic** (Uzbek is written in both; Russian is Cyrillic). Use **Onest** for display and **Manrope** for UI text — both cover Latin and Cyrillic. Arabic prayer names appear as secondary text — use **Amiri** for those. **Russian strings run 20–40% longer than English** — design every button, label, and card to survive that without truncating or wrapping badly. Show me at least one screen in Russian to prove the layout holds.

### Icons

Inline stroke SVG at 1.8–2.2px weight, rounded caps and joins. **Never emoji** — they don't render consistently across Android devices and can't be recolored.

---

## Product principles that constrain the design

These are non-negotiable and should be visible in your choices:

1. **Do not turn worship into a game.** Progress visuals represent personal habit, never religious standing. "Your garden has grown 17 days" — never "Level 17."
2. **No guilt.** A missed prayer is shown neutrally, never in alarming red with a sad face. The design must never make someone feel they have failed at their faith.
3. **Never imply the app verified someone prayed.** The camera detects an object. That is all it claims.
4. **Calm over urgent.** No red badges, no countdown pressure, no streak-loss anxiety.

---

## Deliverable 1 — Design system

Before any screens, give me one artifact containing:

- Full color token set, including all time-of-day gradient states, in light and dark
- Type scale with real sample text in Uzbek, Russian, and English
- Spacing and radius scale
- Core components: buttons (primary/secondary/ghost), prayer pill, card, bottom sheet, input, toggle, progress indicators, permission-request card
- Iconography direction with examples
- Motion specification: durations, easing curves, and what animates on each key transition

---

## Deliverable 2 — Screens

Design these. Group related screens in a single artifact where it helps comparison.

### Priority 1 — the screens that define the app

**Home / Today** — the most important screen in the product. It must answer "what prayer is next?" in under a second.
Contains: greeting, next prayer with name in Uzbek + Arabic and a live countdown, today's five prayers as tappable status pills, an animated garden preview, a 7-day consistency strip, and a charity total strip. Background gradient reflects current time of day. Show me this screen at **three different times of day** so I can see the gradient system working.

**Fajr alarm (ringing)** — full-screen, appears over the lock screen at ~5am in a dark room. One job: get the user out of bed. Large, legible, minimal. A single primary action: "Scan to stop." A secondary escape exists but is deliberately understated (press and hold 10 seconds). Must be readable by someone half-awake.

**Camera scan** — live camera view with a target reticle and real-time feedback ("Looking for your prayer mat…" → "✓ Found"). Calm success state, not a game-show win.

**Focus block overlay** — a native full-screen interrupt that appears when the user opens Instagram during prayer time. This is the most delicate screen in the app: it is *interrupting someone*, so it must feel like a gentle hand on the shoulder, not a punishment or a paywall. Shows which prayer, time remaining, and an "I've prayed" action.

**Garden** — the consistency visualization. An organic, living scene that grows with habit. Must feel personal and calm, and must never read as a score or a level. Show three growth stages: new, developing, established.

### Priority 2 — core flows

- **Prayer timetable** — today's six times (including sunrise), current one highlighted, scrollable to other days
- **Month calendar** — grid with per-day completion state, handled without shaming the gaps
- **Prayer detail sheet** — log as prayed / missed / later
- **Qaza tracker** — running count of missed prayers plus a make-up flow. This must be encouraging, not a debt ledger.
- **Focus home** — Gentle / Focus / Deep Focus mode selector
- **App picker** — installed apps with icons and checkboxes, searchable
- **Stats** — weekly and monthly consistency, per-prayer breakdown, Fajr record
- **Charity: the promise** — plain-language explanation of the net-profit methodology
- **Charity: report detail** — revenue, expenses, profit, donated, plus allocation breakdown and a proof-document viewer. **Design the honest zero state too:** at launch there is no revenue yet, and that screen needs to feel trustworthy rather than empty.

### Priority 3 — onboarding (16 screens)

Duolingo-style: one question per screen, big type, large tap targets, progress bar, no typing until the very end. Should feel quick despite the length.

Sequence: splash → language → 3-slide value carousel (Pray · Focus · Give) → gender → "how often do you pray now?" → "biggest struggle?" → goal → madhhab & calculation method → location permission → **prayer time confirmation** → notification permission → Fajr intro → scan object choice → focus intro + app picker → account → soft paywall.

Two of these need special care:

- **Prayer time confirmation** is the trust screen. Uzbek users will compare against the official muftiyat calendar on their wall. It shows the calculated times and asks "do these match your local calendar?" with an easy manual adjustment. Getting this screen right earns credibility in the first 60 seconds.
- **Permission screens** must explain *why* before the Android system dialog appears, in plain language. The app needs location, notifications, camera, usage access, overlay, and alarm permissions — that is a lot to ask, and each request needs to feel earned.

### Priority 4 — supporting

- Settings (index + prayer settings + notification settings)
- **Cycle mode** — for women, pauses prayer tracking during menstruation so those days are never marked missed. Handle with care and dignity: private, matter-of-fact, no euphemism and no clinical coldness. Include the Home screen's cycle banner state, which replaces missed-prayer marks with something restful.
- Paywall / premium
- Qibla compass
- Empty states, loading states, offline state

---

## Technical constraints

The design must be buildable in **React Native (Expo)**:

- Assume Reanimated 3 for motion and Skia for the garden rendering
- No effects that only exist in a browser — no backdrop-filter-heavy stacks, no CSS grid tricks with no RN equivalent
- Mid-range Android is the target device. Animations must hold 60fps on a phone from three years ago.
- The app works fully offline. Design loading and offline states as first-class, not afterthoughts.
- Dark mode is not optional — the Fajr alarm is used in a dark room at 5am, and the whole app should feel correct at night.

---

## How to work

Start with the design system artifact and let me react to it before designing screens. Then work through the priorities in order.

For each screen, briefly note what animates and what the key interaction is — I need to build these, not just admire them.

If a product decision is genuinely ambiguous, ask rather than guessing. But make ordinary visual judgment calls yourself.
