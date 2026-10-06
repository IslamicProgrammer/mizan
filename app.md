from pathlib import Path

path = Path("/mnt/data/prayer_focus_app_plan.md")

content = """# Prayer & Focus App — Full Product Plan

## 0. Reference & Product Direction

### Reference app: Just Pray

**Just Pray** is the primary product reference for this project.

We are using Just Pray to study and understand the product patterns, UX, feature ideas, and behavioral mechanisms that make a modern prayer/focus app useful.

We are **creating our own independent app**, not simply copying Just Pray.

The goal is to take inspiration from concepts such as:

- Fajr wake-up / physical scan interaction

- Prayer-time focus and app blocking

- Prayer tracking

- Visual habit/progress systems

- Modern Muslim-focused UX

Then build our own product with:

- Our own brand and UI

- Our own implementation

- Uzbekistan-first localization

- Our own feature set

- A strong charity/transparency model

- Additional AI and utility features

The product should be clearly differentiated rather than being a clone.

---

# 1. Product Concept

A Muslim prayer companion focused on:

**Pray → Focus → Build consistency → Give back**

The app combines:

- Prayer times and reminders

- Salah tracking

- Fajr wake-up alarm

- Prayer mat / sink scanning

- Prayer-time app blocking

- Garden / consistency visualization

- Qibla

- AI-assisted Islamic guidance

- Transparent charity reporting

### Core differentiator

**100% of net profit is donated to charity.**

The company remains commercially sustainable by paying legitimate operating costs first. The resulting net profit is donated, with monthly public reporting.

---

# 2. Product Pillars

## 🕌 Prayer

- Accurate prayer times

- Fajr / Bomdod

- Dhuhr / Peshin

- Asr

- Maghrib / Shom

- Isha / Xufton

- Sunrise

- Prayer reminders

- Salah logging

- Calculation method settings

- Madhhab / Asr calculation settings

- Manual time adjustments

- Location-based calculation

---

## 🌅 Fajr Wake-Up

A special Fajr alarm designed to make the user physically get out of bed.

Possible dismissal methods:

- Scan prayer mat

- Scan sink

- Eventually allow configurable objects

Example flow:

```text

Fajr time

   ↓

Alarm starts

   ↓

"Get up and scan your prayer mat"

   ↓

Camera opens

   ↓

Computer vision detects prayer mat

   ↓

✓ Scan successful

   ↓

Alarm stops

   ↓

User can mark Salah as completed

```

### Important product principle

The app can verify that an object was detected.

It must **not** claim that AI verified that someone actually performed Salah.

---

## 🚿 Sink Scan

Alternative Fajr flow:

```text

Alarm

   ↓

Get out of bed

   ↓

Go to bathroom

   ↓

Scan sink

   ↓

✓ Sink detected

   ↓

Alarm stops

```

This is intended as a physical wake-up mechanism, not proof of wudu.

---

# 3. 📵 Prayer Focus

Users select distracting apps.

Example:

```text

☑ Instagram

☑ TikTok

☑ YouTube

☑ Telegram

☐ WhatsApp

```

When prayer time arrives, selected apps can be restricted according to the platform's capabilities.

Example:

```text

Peshin starts

   ↓

Focus Mode activated

   ↓

Instagram 🔒

TikTok 🔒

YouTube 🔒

   ↓

User prays

   ↓

Salah completed

   ↓

Apps unlocked

```

### Focus modes

#### Gentle

Prayer time → reminder only.

#### Focus

Prayer time → selected apps blocked → user completes prayer → apps unlocked.

#### Deep Focus

A configurable period before prayer → apps blocked → prayer → configurable period after prayer → apps unlocked.

The feature should be configurable so users do not feel trapped by the app.

---

# 4. 🏠 Home Screen

The home screen should immediately answer:

> What prayer is next?

Example:

```text

Assalamu Alaikum 👋

🌅 BOMDOD

05:12

Next prayer in

02:31:42

━━━━━━━━━━━━━━

Today's Salah

✓ Bomdod

✓ Peshin

○ Asr

○ Shom

○ Xufton

━━━━━━━━━━━━━━

🌱 Your Garden

       🌳

     🌿🌿🌿

   🌱🌱🌱🌱

Your garden is growing.

━━━━━━━━━━━━━━

🤲 This month

$1,240 donated to charity

```

The UI should remain simple and prayer-focused.

---

# 5. Salah Tracking

After each prayer:

```text

Bomdod

Did you pray?

[ ✓ Yes ]

[ Missed ]

[ Later ]

```

After completion:

```text

🌱 Your garden grew!

Bomdod ✓

```

Avoid making worship feel like a competitive game.

Gamification should support habit formation, not assign a religious value to the user.

---

# 6. 🌱 Garden / Growth System

The user starts with:

```text

🌱

```

Consistency gradually develops:

```text

🌱 → 🌿 → 🌳 → 🌴 → 🌸

```

The garden represents **personal consistency and habit growth**, not religious status.

Possible growth inputs:

- Consistent Salah

- Consistent Fajr

- Focus sessions

- Daily consistency

- Weekly consistency

Avoid wording such as:

> "You are level 17 in Islam."

Prefer:

> "Your garden has grown for 17 days."

---

# 7. Streaks & Consistency

Use consistency tracking without excessive punishment.

Example:

```text

M T W T F S S

✓ ✓ ✓ ✓ ✓ ✓ ○

```

Prefer a **consistency score** or flexible progress system over an aggressive streak mechanic that makes users feel they have ruined everything after one missed day.

---

# 8. 🤲 Charity System

The charity model is a major part of the product identity.

### Business model

The company operates normally.

Revenue may be used for:

- Servers

- Google / Apple platform fees

- Payment processing

- Taxes

- Employees

- Legitimate operating expenses

- Other documented business costs

After legitimate expenses:

> **100% of net profit is donated to charity.**

### Important wording

Use:

> **100% of our net profits go to charity.**

Do not say:

> "100% of revenue goes to charity."

The distinction is important for financial accuracy and business sustainability.

---

# 9. 📊 Monthly Charity Report

Create a dedicated Charity section.

Example:

```text

September 2026

Revenue

$12,420

Operating expenses

$7,850

Net profit

$4,570

❤️ Donated

$4,570

```

Then show allocation:

```text

🍚 Food assistance

$1,700

💧 Water

$1,200

🏠 Family assistance

$1,000

🎓 Education

$670

```

Also show:

```text

❤️ Total donated since launch

$47,281

```

---

# 10. Charity Transparency

Every donation should have, where appropriate:

- Organization / recipient

- Date

- Amount

- Purpose

- Supporting documentation

- Receipt / proof

- Cumulative total

Eventually create a public charity dashboard.

The goal is for users to be able to verify where the money went rather than simply trusting a marketing claim.

---

# 11. Business Model

Avoid ads as a core monetization method.

The product philosophy should be:

> No annoying ads in a prayer app.

Possible model:

## Free

- Prayer times

- Salah tracking

- Basic reminders

- Basic garden

- Basic Fajr alarm

## Premium

Potential features:

- Advanced Fajr alarm

- Advanced Focus

- AI features

- More garden environments

- Advanced statistics

- Multiple scan objects

- Family features

- Additional customization

Potential pricing:

**$1.99–$4.99/month**, depending on market and final economics.

Then:

> **100% of net profit → charity**

The premium message becomes:

> Your subscription helps keep the app alive and contributes to charity.

---

# 12. 🤖 AI Features

AI should solve useful problems rather than exist only for marketing.

## AI Islamic Assistant

Potential questions:

- "What breaks wudu?"

- "How do I pray Asr?"

- "What is the dua before sleeping?"

- "Can I pray now?"

- "What should I do if I missed a prayer?"

The assistant should use a carefully curated Islamic knowledge base and cite sources where appropriate.

For fiqh questions, clearly distinguish scholarly opinions, especially where madhhab differences exist.

For Uzbekistan, Hanafi-oriented guidance can be particularly relevant while still allowing users to select their preferred approach where appropriate.

---

# 13. AI Vision

Computer vision can support:

### Prayer mat detection

```text

Camera

   ↓

Vision model

   ↓

Prayer mat detected

   ↓

✓

```

### Sink detection

```text

Camera

   ↓

Vision model

   ↓

Sink detected

   ↓

✓

```

Start with only the objects necessary for the Fajr feature.

---

# 14. 🕋 Qibla

Provide a simple Qibla compass:

```text

       ↑

     137°

       🕋

```

Use device compass + location.

This is a natural utility feature for a prayer app.

---

# 15. 🔔 Notifications

Examples:

### Before prayer

> 🕌 Peshin in 15 minutes.

### At prayer

> 🕌 It's time for Peshin.

### Fajr

> 🌅 Bomdod time. Get up.

### Missed prayer

Avoid guilt-heavy notifications.

Prefer:

> You haven't logged Bomdod yet. Tap to update your prayer log.

---

# 16. 🕌 Mosque Finder

Later feature:

```text

Nearby mosques

Masjid Al-Farabi

1.2 km

Minor Mosque

2.4 km

```

This can be added after MVP.

---

# 17. 🌙 Ramadan Mode

Potential seasonal feature:

- Suhoor

- Iftar

- Fasting tracker

- Ramadan calendar

- Quran progress

- Taraweeh tracking

- Daily reminders

- Charity campaigns

- Ramadan charity report

---

# 18. 📖 Quran

Do not try to become a full Quran app in the first release.

Possible later features:

- Daily ayah

- Short reminders

- Optional Quran reading

- Reading progress

A proper Quran experience can be developed later if it fits the product.

---

# 19. UX Structure

Recommended primary navigation:

```text

Home | Prayer | Focus | Garden | Charity

```

Everything important should be immediately accessible.

---

# 20. MVP

Do not build every planned feature at launch.

### MVP v1

- Prayer times

- Location

- Prayer notifications

- Salah tracking

- Fajr alarm

- Prayer mat scan

- Sink scan

- Basic Android app blocking

- Basic garden

- Basic statistics

- Charity page

- Subscription / payment

- Monthly charity report

This is enough to validate the product.

---

# 21. Version 2

After MVP validation:

- Qibla

- AI Islamic assistant

- Better garden

- Advanced Focus

- Mosque finder

- Ramadan mode

- Quran

- Family accounts

- Better charity dashboard

---

# 22. Version 3

Potential future expansion:

- iOS

- Wear OS

- Apple Watch

- Family mode

- Children mode

- Community features

- Public charity dashboard

- International expansion

---

# 23. Tech Stack

## Mobile

**React Native + Expo**

However, deep Android functionality—especially app blocking, background behavior, and reliable alarms—may require native Android/Kotlin modules.

### MVP platform

**Android first.**

This also aligns with the initial Google Play launch.

## Backend

**Next.js**

Use it for:

- API

- Authentication

- Admin

- Charity reporting

- Subscription backend

- User settings

## Database

**PostgreSQL + Prisma**

## Push notifications

**Firebase Cloud Messaging**

## Analytics

Prefer a privacy-conscious solution such as:

- PostHog

- Firebase Analytics

## AI

Potentially:

- Gemini

- OpenAI

## Storage

Cloudflare R2 / S3-compatible storage.

---

# 24. Backend Data Model

Basic entities:

```text

User

 ├── PrayerSettings

 ├── PrayerLogs

 ├── FocusSettings

 ├── Garden

 ├── Subscription

 └── Notifications

Prayer

 ├── date

 ├── fajr

 ├── dhuhr

 ├── asr

 ├── maghrib

 └── isha

PrayerLog

 ├── userId

 ├── prayer

 ├── date

 └── status

CharityReport

 ├── month

 ├── revenue

 ├── expenses

 ├── profit

 ├── donated

 └── publishedAt

Donation

 ├── reportId

 ├── organization

 ├── amount

 ├── date

 └── proofUrl

```

---

# 25. Admin Dashboard

The admin dashboard is essential.

Example:

```text

Users

24,521

Active today

8,432

Premium

1,821

Revenue

$12,420

Expenses

$7,850

Charity

$4,570

```

## Charity management

```text

September Charity

Profit:

$4,570

[ Add donation ]

Organization:

___________

Amount:

___________

Purpose:

___________

Proof:

[ Upload ]

[ Publish Report ]

```

---

# 26. Trust Model

The charity promise creates a high level of responsibility.

Define the accounting methodology publicly.

Example:

> Net profit = revenue minus documented operating expenses, taxes, payment/platform fees, and other legitimate business costs.

Then:

> 100% of the resulting net profit is donated.

Publish monthly reports consistently.

Do not manipulate accounting presentation to make the donation percentage look better.

---

# 27. Brand Positioning

Do not position the product as:

> "Another Muslim prayer app."

Position it as:

> **A prayer habit + focus app that gives its profits back.**

Potential messaging:

### Option A

**Pray. Focus. Give.**

### Option B

**Protect your Salah. Give back.**

### Option C

**Your prayers. Your focus. Your impact.**

Core concept:

> **Pray. Focus. Give.**

---

# 28. Uzbekistan-First Launch

Start with Uzbekistan.

Languages:

- 🇺🇿 Uzbek

- 🇷🇺 Russian

- 🇬🇧 English

Initial market:

- Tashkent

- Fergana

- Andijan

- Namangan

- Samarkand

- Bukhara

Then expand internationally.

---

# 29. Core MVP Differentiation

Do not try to beat every prayer app.

The first release should revolve around three major reasons to exist:

## 1. 🌅 Fajr Wake-Up

> Get out of bed → scan → continue.

## 2. 📵 Prayer Focus

> Prayer time → distracting apps blocked.

## 3. 🤲 Charity

> 100% of net profit → charity → publicly reported.

Everything else supports these three pillars.

---

# 30. New User Journey

```text

Download

   ↓

Choose language

   ↓

Location permission

   ↓

Calculate prayer times

   ↓

Choose calculation method / madhhab

   ↓

Enable notifications

   ↓

Enable Fajr Wake-up

   ↓

Choose prayer mat / sink

   ↓

Choose distracting apps

   ↓

Create garden

   ↓

Done

```

---

# 31. Example Daily Journey

## Morning

```text

05:12

🌅 Fajr alarm

"Get up and scan your prayer mat."

        ↓

Camera

        ↓

✓ Prayer mat detected

        ↓

"Bomdod vaqti."

        ↓

User prays

        ↓

✓ Salah logged

        ↓

🌱 Garden grows

```

## Afternoon

```text

13:00

🕌 Peshin

Focus Mode activated.

Instagram 🔒

TikTok 🔒

YouTube 🔒

        ↓

User prays

        ↓

✓ Peshin

        ↓

Apps unlocked

```

## End of month

```text

September

Your Salah

143 / 150 ✓

Garden

🌳 Level 12

Community impact

❤️

This month:

$3,421

was donated to charity.

[ See Charity Report ]

```

---

# 32. Product Principles

1. **Prayer first.**

2. **Do not turn worship into a game.**

3. **Gamification supports habits, not religious status.**

4. **AI should assist, not pretend to replace religious scholarship.**

5. **Never claim AI verified that someone prayed.**

6. **Privacy should be treated seriously.**

7. **No manipulative or guilt-heavy notifications.**

8. **Charity claims must be transparent and verifiable.**

9. **100% of net profit goes to charity.**

10. **Use Just Pray as a reference, but build an independent product with its own identity and implementation.**

11. **Android first.**

12. **Launch small, validate, then expand.**

---

# 33. Initial Development Priority

### Phase 1 — Foundation

- Project setup

- React Native / Expo

- Next.js backend

- PostgreSQL / Prisma

- Authentication

- User profile

- Location

- Prayer calculation

### Phase 2 — Core Prayer

- Prayer times

- Prayer UI

- Notifications

- Salah tracking

- Settings

### Phase 3 — Fajr

- Alarm

- Background behavior

- Prayer mat detection

- Sink detection

- Camera flow

- Verification UX

### Phase 4 — Focus

- Android app detection

- Blocking mechanism

- Focus settings

- Prayer-time integration

- Unlock flow

### Phase 5 — Garden

- Garden state

- Consistency calculations

- Growth animations

- Progress UI

### Phase 6 — Monetization

- Premium

- Google Play Billing

- Subscription backend

- Entitlements

### Phase 7 — Charity

- Revenue tracking

- Expense tracking

- Profit calculation

- Donation records

- Monthly reports

- Proof/document uploads

- Public charity page

### Phase 8 — Launch

- Closed testing

- Play Console requirements

- Privacy policy

- Terms

- Store listing

- Screenshots

- Uzbek/Russian/English localization

- Production launch

---

# 34. Final Product Loop

The entire product should ultimately feel like this:

```text

                 ┌──────────────┐

                 │   PRAYER     │

                 └──────┬───────┘

                        ↓

                 ┌──────────────┐

                 │    FOCUS     │

                 └──────┬───────┘

                        ↓

                 ┌──────────────┐

                 │ CONSISTENCY  │

                 └──────┬───────┘

                        ↓

                 ┌──────────────┐

                 │    GARDEN    │

                 └──────┬───────┘

                        ↓

                 ┌──────────────┐

                 │   PREMIUM    │

                 └──────┬───────┘

                        ↓

                 ┌──────────────┐

                 │    PROFIT    │

                 └──────┬───────┘

                        ↓

                 ┌──────────────┐

                 │   CHARITY    │

                 └──────┬───────┘

                        ↓

                 ┌──────────────┐

                 │   IMPACT     │

                 └──────────────┘

```

## One-line product definition

> **A prayer and focus app inspired by the best ideas from Just Pray, rebuilt as an independent Uzbekistan-first product with Fajr wake-up scanning, prayer-time app blocking, habit growth, AI assistance, and a transparent promise that 100% of net profit goes to charity.**

"""

path.write_text(content, encoding="utf-8")

print(path)
