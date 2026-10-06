# Mizan — state of play, 7 Oct 2026

Branch `feat/android-release`. Everything below is committed.

## How to run it

```bash
cd mobile && npx expo start          # dev server on 8081
```

Android emulator + Expo Go: the AVD is `Pixel_8_Pro_API_35`. If the emulator
window lands off-screen, quit it first (`adb emu kill` — it rewrites its
position file on exit, so editing it while running does nothing), then:

```bash
sed -i '' -e 's/^window\.y = .*/window.y = 60/' -e 's/^window\.x = .*/window.x = 80/' \
  ~/.android/avd/Pixel_8_Pro_API_35.avd/emulator-user.ini
```

`adb reverse` tunnels die with the emulator instance. After any emulator
restart:

```bash
adb reverse tcp:8081 tcp:8081
```

Expo Go must be **57.0.9** or newer. 2.30.11 silently fails with "Network
response timed out" — press `a` in the `expo start` terminal and Expo CLI
installs the matching client.

Server:

```bash
cd server && DATABASE_URL=... JWT_SECRET=<32+ chars> GOOGLE_CLIENT_ID=x npm run dev
```

Docker is not installed. For a local Postgres, follow
`.superpowers/sdd/2026-10-06-mizan-android-release/local-postgres.md` — Homebrew
`postgresql@16` on port 55432. Two traps it documents: the socket dir must be a
short `/tmp` path (103-byte limit), and `postgres` on `PATH` is 14.18 while the
keg you want is 16.13.

## Gates

```bash
cd server && npx tsc --noEmit && npm test            # 54 pass, 2 skipped
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
```

`npm run smoke` renders all **25** routes in headless Chrome. It prints one `ok`
per route and `all routes rendered` only when none failed. Several agents
miscounted this as 24; it is 25.

## Done

**Server** — Fastify, Postgres, idempotent migration runner, `POST /auth/google`
(Google ID token → our JWT, audience pinned), `issueToken`/`verifyToken`
(HS256 pinned, 30-day, `JWT_SECRET` ≥32 enforced in the loader),
`GET`/`PUT /profile` (atomic via `SELECT … FOR UPDATE`, merge rule, `kept`
capped at 5, `dropped[]` returned).

**Mobile** — real prayer times via adhan, 25 screens, marking, garden, streak,
persisted qaza, tasbih, qibla, stats and month computed from real history,
real cycle tracking, focus minutes with a per-day chart, honest empty states,
env validation, prayer notifications (written, never watched fire).

**Privacy** — `allowBackup: false`; `cycles` lives in SecureStore, never in the
AsyncStorage blob, and is dropped by `stateForSync` so it cannot reach the
network.

## Not done

Blocked on the owner: Task 8 (needs a Google OAuth **Web** client ID),
Task 9 (SSH host for Contabo), Task 12 (Play Console + privacy policy URL),
Task 3/4 (`eas init`, domain).

Not blocked: Task 17 (record which prayers were kept), Task 11 (Doze /
exact-alarm permission), Task 13 (language picker and privacy link honesty).

Still mocked: Fajr scan detection is a timer, not recognition. App blocking is
not implemented. Charity report content needs the server. The language picker
offers Russian and English; the app is Uzbek-only.

## Open decision, time-sensitive

`mobile/app.json` declares `package: "uz.mizan.app"`. Plan decision D5 said
`uz.mizanapp.app` if `mizanapp.uz` is bought. **Permanent after the first Play
upload.** Nothing has been uploaded, so it is free to change now.

## Things that cost time, so they are not rediscovered

- `expo-notifications` throws on **import** inside Expo Go on Android (Expo
  removed its native half in SDK 53). A static import took the whole app down —
  the importing module never finished evaluating, so the root layout exported
  nothing. `notify.ts` now loads it through a guarded dynamic import. Anything
  else Expo Go lacks must be imported the same way.
- Expo inlines an `EXPO_PUBLIC_*` variable **only** where the source literally
  spells `process.env.EXPO_PUBLIC_NAME`. Passing `process.env` to a helper that
  indexes it by string leaves nothing for Metro to substitute, and the value is
  `undefined` on device while every test passes under Node.
- `nodenext` + `"type": "module"` in `server/` means every relative import needs
  a `.js` extension or `tsc` fails with TS2835.
- Hermes ships no `uz-UZ` ICU data. Use `MONTHS_UZ` / `WEEKDAYS_UZ`, never
  `toLocaleDateString`.
- The recurring bug class in this codebase: **absence of a record read as
  evidence of failure.** It appeared five separate times — days before install,
  days that had not happened, the day being lived, a live cycle day, and a month
  in progress. When touching anything that counts prayers, check that first.

## Process

The plan is `docs/superpowers/plans/2026-10-06-mizan-android-release.md`
(18 tasks). The running ledger — every decision, ruling and finding — is
`.superpowers/sdd/2026-10-06-mizan-android-release/progress.md`. That directory
is git-ignored, so `git clean -fdx` destroys it; the commits survive either way.

Work ran as: brief per task → implementer subagent → reviewer subagent → fix
rounds until clean → verify in-session before marking complete.
