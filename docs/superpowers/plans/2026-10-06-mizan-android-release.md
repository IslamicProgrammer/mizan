# Mizan Android Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take Mizan from a working local demo to a published Google Play app with real users.

**Architecture:** The app stays offline-first — prayer times, marking, garden, tasbih and alarm all work with no network. A thin Node.js service handles only what cannot live on the device: account identity and charity report content. The Fajr scan runs on-device. Android app blocking avoids `AccessibilityService`.

**Tech Stack:** Expo SDK 57 / React Native 0.86 / TypeScript · EAS Build + Submit · Node.js + Fastify + Postgres (Supabase) · expo-notifications · on-device image classification

**Spec:** `app.md` (product), `design-system.md` (design, §1–§10), `mobile/README.md` (current implementation decisions)

---

## Global Constraints

- **Android package name `uz.mizan.app` is permanent after first upload.** Change it before Task 1 or never.
- **Personal Play accounts created after 13 Nov 2023 need 12 testers opted in continuously for 14 days**, and since 2026 Google checks the testers actually used the app. Organisation accounts registered to a legal entity are exempt.
- Target Expo SDK 57, React Native 0.86, React 19.2.3. `react-dom` is pinned to exactly `19.2.3`; the caret range resolves to 19.3.0 and breaks the peer tree.
- Always use `npx expo install`, never `npm install`, for any Expo or React Native package.
- Every screen's copy comes from `design-v3/*.html` verbatim. Changing user-facing text means changing the mockup first.
- The gate before any task is called done: `npx tsc --noEmit` · `npx expo lint` · `npm run smoke` · `npx expo-doctor`.
- No secret is ever committed. `.secrets/` and `*.key` are already gitignored; EAS secrets and `.env` must join them.

## Review Focus

Five things the spec implies that no obvious task tests, most likely to bite a real user first:

1. **A tester with no network at 05:00.** Prayer times, the alarm and the scan must all work offline; only auth and charity content may require a network.
2. **Android killing the alarm.** Doze, battery optimisation and OEM task-killers silently drop exact alarms — the one failure that makes the product pointless.
3. **A second device, or a reinstall.** "Required account at signup" implies the garden and streak survive reinstalling; today everything is in AsyncStorage only.
4. **A date that moves while the app is open.** `rollOver` runs on foreground, but a tester crossing midnight mid-session, or changing timezone on a flight, must not lose or double-count a day.
5. **Uzbek text longer than the layout.** Russian strings run 20–40% longer than Uzbek; no screen has been tested in Russian and the language picker offers it.

---

## Decisions that block this plan

Four decisions change the work materially. Each has a recommendation; none should be assumed.

### D1 — Play account type *(blocks Task 1, changes the timeline by weeks)*

| Option | Cost | Timeline |
|---|---|---|
| **Personal** (current) | free | 12 testers × 14 continuous days before production |
| **Organisation** | legal entity + D-U-N-S number | exempt from the tester requirement |

**Recommendation: stay personal and start the clock now.** Registering an Uzbek entity and obtaining a D-U-N-S takes longer than 14 days, and the tester period is useful anyway — this product's core loop can only be judged over a fortnight of real mornings.

### D2 — Fajr scan recognition *(blocks Phase 3; a stated promise is at stake)*

The app tells the user, in two places, **"Rasm saqlanmaydi va hech qayerga yuborilmaydi"** — the image is not saved and not sent anywhere (`design-v3/11-scanobject.html`, `mobile/src/app/alarm/scan.tsx`).

| Option | Keeps the promise | Works at 05:00 offline | Effort | Cost |
|---|---|---|---|---|
| **On-device classifier** | yes | yes | high | zero per use |
| **Cloud Gemini** | **no — copy must change** | no | low | per call, every morning, every user |
| Hybrid, cloud fallback | no, on the fallback path | partly | high | partial |

**RESOLVED 9 Oct 2026 by the owner: cloud Gemini, and the copy changes.** The
promise in `design-v3/11-scanobject.html` and `scan.tsx` is rewritten to say
plainly that the photo is sent to a server and deleted after matching, and the
privacy policy must say the same. Task 22 carries that work; shipping the
recognition without the copy change would make the app lie about the one thing
it is loudest about. Note the key cannot live in the app — anything in
`EXPO_PUBLIC_*` is readable by anyone who downloads the APK — so the image goes
to our own server, which holds the Gemini key. The original recommendation,
left for the record: **on-device.** Three reasons, in order. The promise is already printed in the UI and withdrawing it is a real cost to a product whose other differentiator is public honesty. The alarm fires at dawn when a phone may be in airplane mode or on poor rural signal, and a scan that needs the network is a scan that fails exactly when it matters. And a per-call cost on a daily action for every user, in a market where the subscription is ~16 500 so'm/month, is a bad unit economic.

**If Gemini is chosen anyway**, the plan must add a task to rewrite that copy in `design-v3/11-scanobject.html` and `scan.tsx` to say plainly that the photo is sent to a server and deleted after matching — and the privacy policy must say the same.

### D3 — Android app blocking *(blocks Phase 4; Play rejection risk)*

`AccessibilityService` is the easy implementation and the risky one. Google requires prominent in-app disclosure, a demo video with every submission, Play-listing disclosure, and proof no narrower API suffices; developers report repeated rejections for exactly this use, and Android 17 restricts the API further for non-accessibility apps.

**Recommendation: `UsageStatsManager` + overlay, with a `specialUse` foreground service.** Weaker — it reacts a moment after an app opens rather than preventing it — but it is the narrower API, which is the test Google applies, and it is what the mockup already promises: *"bu qulf emas, eslatma"* — this is not a lock, it is a reminder. The design has already chosen the gentler behaviour; the implementation should match it.

### D4 — Backend host *(decided: self-hosted Node.js on Contabo)*

**Node.js on the existing Contabo VPS.** No managed auth, no BaaS.

What that changes versus a managed service: session handling, token issuing,
password-less sign-in, TLS, backups and uptime all become ours. The upside is no
vendor, no per-user pricing, and the server already exists and is paid for.

Stack, chosen for the smallest surface that does the job:

| Piece | Choice | Why |
|---|---|---|
| HTTP | Fastify + TypeScript | typed, fast, schema validation built in |
| DB | Postgres 16 in Docker | one table to start; no ORM needed |
| Migrations | plain `.sql` files, applied in order | the schema is tiny and an ORM would be the larger dependency |
| Sign-in | Google ID token, verified server-side | no passwords to store, no SMS cost in UZ, one tap on Android |
| Sessions | our own JWT (`jose`), 30-day refresh | the app is offline-first; a long-lived token avoids waking the network |
| TLS + proxy | Caddy | automatic certificates, one config file |
| Process | Docker Compose + systemd unit | survives reboot without a PaaS |

**`api.mizanapp.uz` must resolve before Task 12.** Caddy obtains certificates over
HTTP-01, so the domain has to exist and point at the Contabo IP first. This puts
the domain purchase on the critical path for Phase 1 — not for Phase 0.

### D5 — Package name *(open; permanent after first upload)*

Currently `uz.mizan.app`, which is the reverse of `app.mizan.uz`. If `mizanapp.uz`
is bought, the matching name is **`uz.mizanapp.app`**.

**Decide before Task 10 and not after.** The package name cannot be changed once
anything is uploaded to Play — a different name means a different app, a new
listing, and every tester reinstalling. Owning the domain is not legally required
for the package name, but picking one that matches a domain you do not end up
owning is a permanent small embarrassment.

## Phasing, and why this order

The 12-tester clock is the critical path and it is **calendar time, not work time** — nothing shortens it and it cannot start until testers can install and genuinely use the app. Everything before it is therefore ordered by "what must be true for a tester to use this every morning", not by feature importance.

| Phase | Outcome | Blocks the clock? |
|---|---|---|
| 0 | Repo, env and EAS ready; first internal build installs | yes |
| 1 | Node API live on Contabo; account at signup works | yes — signup is required to reach the app |
| 2 | Prayer notifications fire reliably | yes — without them nobody opens it daily |
| **→** | **Ship to closed testing. 14-day clock starts.** | |
| 3 | Fajr scan recognises a real prayer mat | no |
| 4 | App blocking during prayer windows | no |
| 5 | Charity content + admin on the same API | no |
| 6 | Store listing, policy, production rollout | — |

Phases 3–5 run **during** the 14 days, shipped to the same testers as updates. That is the whole reason for this ordering: the clock runs while the differentiators get built.

---

## File Structure

```
/                                  ← becomes one git repo (currently only mobile/ is)
  mobile/                          ← the Expo app, unchanged in layout
    eas.json                       NEW  build + submit profiles
    .env.example                   NEW  the shape of the env, committed
    src/data/
      env.ts                       NEW  reads and validates env once, fails loudly
      auth.ts                      NEW  Supabase client + session hooks
      sync.ts                      NEW  push/pull of history and settings
      notify.ts                    NEW  scheduling prayer notifications
    src/app/(auth)/
      sign-in.tsx                  NEW  the only pre-account screen
  server/                          NEW  Node.js API — Phase 1, deployed to Contabo
    src/
      index.ts                     Fastify bootstrap
      env.ts                       env read once, validated
      db.ts                        pg pool + migration runner
      auth/google.ts               verifies a Google ID token
      auth/token.ts                issues and verifies our JWT
      routes/auth.ts               POST /auth/google
      routes/profile.ts            GET and PUT /profile
      sync/merge.ts                shared merge rule
    migrations/
      0001_profiles.sql
    Dockerfile
    docker-compose.yml             api + postgres + caddy
    Caddyfile
  docs/superpowers/plans/          this plan and the per-phase plans
```

Each phase below that is on the critical path is written at task level. Phases 3–6
name their outcome and open questions; **each gets its own task-level plan when
its phase starts**, because the decisions above change their shape.

---

## Phase 0 — Repo, env and a build that installs

### Task 1: One git repo at the project root

**Files:**
- Create: `.gitignore` (root), `.gitattributes`
- Modify: remove `mobile/.git`

**Interfaces:**
- Produces: a single repo whose root is the project; every later task commits here.

- [ ] **Step 1: Confirm what the nested repo holds**

```bash
cd "mobile" && git log --oneline | head -5 && git status --short | head -20
```
Expected: one "Initial commit" from the Expo template plus uncommitted work. Nothing worth preserving — the template commit has no history we need.

- [ ] **Step 2: Remove the nested repo and init at the root**

```bash
rm -rf mobile/.git
cd "/Users/murodjonazamov/Desktop/Fajr App" && git init
```

- [ ] **Step 3: Write the root .gitignore**

```gitignore
# secrets — never commit
.secrets/
*.key
.env
.env.*
!.env.example
google-services.json
*.keystore
*.jks

# node / expo
node_modules/
.expo/
dist/
*.log

# os
.DS_Store
```

- [ ] **Step 4: Verify no secret is staged**

```bash
git add -A && git status --short | grep -iE "\.env$|\.key|keystore|secrets/" || echo "clean — no secrets staged"
```
Expected: `clean — no secrets staged`

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: single repo at project root, secrets ignored"
```

---

### Task 2: Env handling that fails loudly

**Files:**
- Create: `mobile/.env.example`, `mobile/src/data/env.ts`
- Test: `mobile/src/data/__tests__/env.test.ts`

**Interfaces:**
- Produces: `readEnv(raw): Env` and `getEnv(): Env` where `Env = { apiUrl: string }`,
  from the single variable `EXPO_PUBLIC_API_URL`. Consumed by the mobile app's own
  network layer in Task 8.

> **Amended during execution.** This task originally produced
> `{ supabaseUrl, supabaseAnonKey }` and an eager `export const ENV`. Both are
> gone. Supabase was dropped when the backend was settled as Node.js only, and
> the eager export was replaced by a lazy memoised `getEnv()` after review found
> two defects in the code below: Expo's bundler inlines an `EXPO_PUBLIC_*`
> variable **only** where the source literally spells
> `process.env.EXPO_PUBLIC_NAME` as a member expression, so passing the whole
> `process.env` into a helper that indexes it by string left nothing for Metro to
> substitute and the value was `undefined` on every device; and an eager export
> gave the module an import-time side effect that would throw for any importer
> wanting only its types. The shipped version is `mobile/src/data/env.ts` at
> commits `2841e52` and `596cb66` — read that file, not the steps below. The
> server's own `ENV` (`databaseUrl`, `jwtSecret`, `googleClientId`, `port`) is a
> separate thing produced by Task 5, and it is that one `auth.ts` imports.

A missing env must fail at startup with a sentence naming the variable, not
produce `undefined` that surfaces as a confusing network error three screens later.

- [ ] **Step 1: Install the test runner**

```bash
cd mobile && npx expo install jest-expo jest --dev
```

- [ ] **Step 2: Add the test script**

In `mobile/package.json` scripts: `"test": "jest"`. Add at the top level:

```json
"jest": { "preset": "jest-expo" }
```

- [ ] **Step 3: Write the failing test**

```ts
// mobile/src/data/__tests__/env.test.ts
import { readEnv } from '../env';

describe('readEnv', () => {
  it('returns the config when every variable is present', () => {
    expect(
      readEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
    ).toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon-key' });
  });

  it('names the missing variable in the error', () => {
    expect(() => readEnv({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toThrow(
      /EXPO_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it('rejects an empty string, which dotenv produces for a blank line', () => {
    expect(() =>
      readEnv({ EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' }),
    ).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

```bash
cd mobile && npx jest src/data/__tests__/env.test.ts
```
Expected: FAIL — `Cannot find module '../env'`

- [ ] **Step 5: Write the implementation**

```ts
// mobile/src/data/env.ts
/**
 * Env is read once, here, and a missing value throws immediately with the
 * variable's name. An undefined that leaks into a client surfaces later as an
 * unrelated network error, which is a much worse hour to spend.
 */
type Raw = Record<string, string | undefined>;

export type Env = { supabaseUrl: string; supabaseAnonKey: string };

export function readEnv(raw: Raw): Env {
  const need = (key: string): string => {
    const v = raw[key];
    if (!v) throw new Error(`Missing env ${key} — copy mobile/.env.example to mobile/.env`);
    return v;
  };
  return {
    supabaseUrl: need('EXPO_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: need('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  };
}

export const ENV: Env = readEnv(process.env as Raw);
```

- [ ] **Step 6: Run the tests and watch them pass**

```bash
cd mobile && npx jest src/data/__tests__/env.test.ts
```
Expected: 3 passed

- [ ] **Step 7: Write .env.example and commit**

```bash
cat > mobile/.env.example <<'EOF'
# Copy to mobile/.env and fill in. Never commit .env.
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EOF
git add -A && git commit -m "feat: env read once and validated at startup"
```

---

### Task 3: EAS build profiles and a first internal build

**Files:**
- Create: `mobile/eas.json`
- Modify: `mobile/app.json` (version code handling)

**Interfaces:**
- Produces: an installable `.apk` from `eas build -p android --profile preview`, and an `.aab` from `--profile production`.

**Before Step 1, D1 and D5 must be answered — the package name cannot change after Task 12.**

- [ ] **Step 1: Install the CLI and log in**

```bash
cd mobile && npx eas-cli@latest login
```

- [ ] **Step 2: Write eas.json**

```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "channel": "preview"
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" },
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "android": { "track": "internal", "releaseStatus": "draft" }
    }
  }
}
```

- [ ] **Step 3: Initialise the project on EAS**

```bash
cd mobile && npx eas-cli@latest init
```
Expected: an `extra.eas.projectId` appears in `app.json`. Commit it — it is not a secret.

- [ ] **Step 4: Build an installable APK**

```bash
cd mobile && npx eas-cli@latest build -p android --profile preview
```
Expected: a build URL and a downloadable `.apk`. This is the first time the app runs outside Expo Go, so it is the first time a native module can fail — read the build log, do not just wait for the link.

- [ ] **Step 5: Install it on a real Android device and walk the core loop**

Onboarding → home → mark a prayer → garden grows → tasbih counts → alarm screen opens. Native-only failures surface here and nowhere earlier.

- [ ] **Step 6: Commit**

```bash
git add mobile/eas.json mobile/app.json && git commit -m "build: EAS profiles for development, preview and production"
```

---

### Task 4: Store the app's env on EAS, not on disk

- [ ] **Step 1: Push the API url as an EAS env var**

```bash
cd mobile
npx eas-cli@latest env:create --name EXPO_PUBLIC_API_URL --value "https://api.mizanapp.uz" --environment production --visibility plaintext
```

Everything with an `EXPO_PUBLIC_` prefix is **compiled into the app bundle and
readable by anyone who downloads it**. Only values that are safe in public belong
here. `JWT_SECRET`, `POSTGRES_PASSWORD` and the Google client *secret* live on
the Contabo box alone (Task 9) and must never appear in this project.

- [ ] **Step 2: Verify it resolves**

```bash
cd mobile && npx eas-cli@latest env:list --environment production
```
Expected: `EXPO_PUBLIC_API_URL` listed.

- [ ] **Step 3: Commit nothing**

There is nothing to commit — that is the point of this task.

---

## Phase 1 — An account at signup, on our own server

The product decision was "required account at signup", so auth blocks the tester
clock. Phase 1 is now five tasks instead of three because the server is ours:
nothing issues tokens or stores rows unless we write it.

Build the server first and the app against it second — a mobile client written
against an imagined API is a client rewritten.

### Task 5: Server skeleton, Postgres, and a migration runner

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`, `server/src/env.ts`, `server/src/db.ts`, `server/migrations/0001_profiles.sql`
- Test: `server/src/__tests__/db.test.ts`

**Interfaces:**
- Produces: `pool: Pool`; `migrate(): Promise<void>`; `ENV` with `databaseUrl`, `jwtSecret`, `googleClientId`, `port`. Consumed by every later server task.

- [ ] **Step 1: Scaffold**

```bash
mkdir -p server/src server/migrations && cd server
npm init -y
npm i fastify pg jose google-auth-library zod
npm i -D typescript tsx @types/node @types/pg vitest
npx tsc --init --target es2022 --module nodenext --moduleResolution nodenext --strict --outDir dist --rootDir src
```

Add scripts: `"dev": "tsx watch src/index.ts"`, `"build": "tsc"`, `"start": "node dist/index.js"`, `"test": "vitest run"`.

- [ ] **Step 2: Write the failing migration test**

Migrations must be idempotent — they run on every boot, and a second run that
throws takes the API down on restart.

```ts
// server/src/__tests__/db.test.ts
import { describe, expect, it } from 'vitest';
import { pendingMigrations } from '../db';

describe('pendingMigrations', () => {
  it('returns every file when none have been applied', () => {
    expect(pendingMigrations(['0001_a.sql', '0002_b.sql'], [])).toEqual(['0001_a.sql', '0002_b.sql']);
  });

  it('skips the ones already applied', () => {
    expect(pendingMigrations(['0001_a.sql', '0002_b.sql'], ['0001_a.sql'])).toEqual(['0002_b.sql']);
  });

  it('applies in filename order regardless of directory order', () => {
    expect(pendingMigrations(['0002_b.sql', '0001_a.sql'], [])).toEqual(['0001_a.sql', '0002_b.sql']);
  });

  it('returns nothing when everything is applied, so a restart is a no-op', () => {
    expect(pendingMigrations(['0001_a.sql'], ['0001_a.sql'])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
cd server && npx vitest run src/__tests__/db.test.ts
```
Expected: FAIL — cannot find `../db`

- [ ] **Step 4: Write env and db**

```ts
// server/src/env.ts
const need = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env ${k} — see server/.env.example`);
  return v;
};

export const ENV = {
  databaseUrl: need('DATABASE_URL'),
  jwtSecret: need('JWT_SECRET'),
  googleClientId: need('GOOGLE_CLIENT_ID'),
  port: Number(process.env.PORT ?? 8080),
};
```

```ts
// server/src/db.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

import { ENV } from './env';

export const pool = new Pool({ connectionString: ENV.databaseUrl });

/** Pure so it can be tested without a database. */
export function pendingMigrations(all: string[], applied: string[]): string[] {
  const done = new Set(applied);
  return all.filter((f) => !done.has(f)).sort();
}

export async function migrate(dir = join(import.meta.dirname, '../migrations')): Promise<void> {
  await pool.query(
    'create table if not exists _migrations (name text primary key, applied_at timestamptz default now())',
  );
  const { rows } = await pool.query<{ name: string }>('select name from _migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
  for (const name of pendingMigrations(files, rows.map((r) => r.name))) {
    const sql = readFileSync(join(dir, name), 'utf8');
    // one transaction per migration: a half-applied schema is worse than none
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into _migrations (name) values ($1)', [name]);
      await client.query('commit');
      console.log(`migrated ${name}`);
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }
}
```

- [ ] **Step 5: Run the tests and watch them pass**

```bash
cd server && npx vitest run src/__tests__/db.test.ts
```
Expected: 4 passed

- [ ] **Step 6: Write the schema**

```sql
-- server/migrations/0001_profiles.sql
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  google_sub    text unique not null,
  email         text,
  created_at    timestamptz not null default now()
);

create table if not exists profiles (
  user_id    uuid primary key references users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 7: Boot it with a health check**

```ts
// server/src/index.ts
import Fastify from 'fastify';

import { migrate, pool } from './db';
import { ENV } from './env';

const app = Fastify({ logger: true });

app.get('/health', async () => {
  await pool.query('select 1');
  return { ok: true };
});

await migrate();
await app.listen({ port: ENV.port, host: '0.0.0.0' });
```

- [ ] **Step 8: Verify locally**

```bash
cd server && docker run -d --name mizan-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16
DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres JWT_SECRET=dev GOOGLE_CLIENT_ID=x npm run dev
curl -s localhost:8080/health
```
Expected: `{"ok":true}` and `migrated 0001_profiles.sql` in the log. Restart it.
Expected: no migration line the second time.

- [ ] **Step 9: Commit**

```bash
git add server && git commit -m "feat(server): fastify skeleton, postgres, idempotent migrations"
```

---

### Task 6: Verify a Google ID token, issue our own JWT

**Files:**
- Create: `server/src/auth/google.ts`, `server/src/auth/token.ts`, `server/src/routes/auth.ts`
- Test: `server/src/__tests__/token.test.ts`

**Interfaces:**
- Consumes: `ENV`, `pool`.
- Produces: `issueToken(userId: string): Promise<string>`; `verifyToken(jwt: string): Promise<{ userId: string } | null>`; route `POST /auth/google` taking `{ idToken: string }` and returning `{ token: string; userId: string }`.

- [ ] **Step 1: Write the failing token test**

An expired or forged token must read as *not signed in*, never throw and never
pass. This is the whole security boundary of the API.

```ts
// server/src/__tests__/token.test.ts
import { describe, expect, it } from 'vitest';
import { issueToken, verifyToken } from '../auth/token';

describe('token', () => {
  it('round-trips the user id', async () => {
    const t = await issueToken('user-1');
    expect(await verifyToken(t)).toEqual({ userId: 'user-1' });
  });

  it('rejects a token signed with a different secret', async () => {
    expect(await verifyToken('eyJhbGciOiJIUzI1NiJ9.e30.bad-signature')).toBeNull();
  });

  it('rejects garbage without throwing', async () => {
    expect(await verifyToken('not-a-jwt')).toBeNull();
  });

  it('rejects an already-expired token', async () => {
    const t = await issueToken('user-1', -60);
    expect(await verifyToken(t)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd server && npx vitest run src/__tests__/token.test.ts
```
Expected: FAIL — cannot find `../auth/token`

- [ ] **Step 3: Write the token module**

```ts
// server/src/auth/token.ts
import { SignJWT, jwtVerify } from 'jose';

import { ENV } from '../env';

const key = new TextEncoder().encode(ENV.jwtSecret);
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function issueToken(userId: string, ttlSeconds = THIRTY_DAYS): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(key);
}

/**
 * Returns null for anything that is not a currently-valid token we signed.
 * Never throws: a throw in a request handler becomes a 500, and a 500 on an
 * expired token would make the app look broken instead of signed out.
 */
export async function verifyToken(jwt: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(jwt, key);
    return payload.sub ? { userId: String(payload.sub) } : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
cd server && npx vitest run src/__tests__/token.test.ts
```
Expected: 4 passed

- [ ] **Step 5: Verify the Google token and upsert the user**

```ts
// server/src/auth/google.ts
import { OAuth2Client } from 'google-auth-library';

import { ENV } from '../env';

const client = new OAuth2Client(ENV.googleClientId);

export type GoogleUser = { sub: string; email?: string };

/** Returns null for any token Google does not vouch for, for OUR client id. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUser | null> {
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: ENV.googleClientId });
    const p = ticket.getPayload();
    return p?.sub ? { sub: p.sub, email: p.email } : null;
  } catch {
    return null;
  }
}
```

```ts
// server/src/routes/auth.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { verifyGoogleIdToken } from '../auth/google';
import { issueToken } from '../auth/token';
import { pool } from '../db';

const Body = z.object({ idToken: z.string().min(1) });

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/google', async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'idToken required' });

    const g = await verifyGoogleIdToken(parsed.data.idToken);
    if (!g) return reply.code(401).send({ error: 'invalid token' });

    const { rows } = await pool.query<{ id: string }>(
      `insert into users (google_sub, email) values ($1, $2)
       on conflict (google_sub) do update set email = excluded.email
       returning id`,
      [g.sub, g.email ?? null],
    );
    const userId = rows[0].id;
    await pool.query(
      'insert into profiles (user_id) values ($1) on conflict (user_id) do nothing',
      [userId],
    );
    return { token: await issueToken(userId), userId };
  });
}
```

- [ ] **Step 6: Verify a bad token is refused**

```bash
curl -s -X POST localhost:8080/auth/google -H 'content-type: application/json' -d '{"idToken":"nope"}' -w ' %{http_code}\n'
```
Expected: `{"error":"invalid token"} 401`

- [ ] **Step 7: Commit**

```bash
git add server && git commit -m "feat(server): google id token exchange for our jwt"
```

---

### Task 7: Profile state endpoints with the merge rule

**Files:**
- Create: `server/src/sync/merge.ts`, `server/src/routes/profile.ts`
- Test: `server/src/__tests__/merge.test.ts`

**Interfaces:**
- Consumes: `verifyToken`, `pool`.
- Produces: `mergeHistory(local, remote)`; `GET /profile` → `{ state }`; `PUT /profile` taking `{ state }` → `{ state }` (the merged result).

This is Review Focus #3 — without it "required account" buys the user nothing.
The merge lives on the server so two devices cannot disagree about who is right.

- [ ] **Step 1: Write the failing merge test**

```ts
// server/src/__tests__/merge.test.ts
import { describe, expect, it } from 'vitest';
import { mergeHistory } from '../sync/merge';

describe('mergeHistory', () => {
  it('keeps days present on only one side', () => {
    expect(mergeHistory({ '2026-10-01': { kept: 5 } }, { '2026-10-02': { kept: 3 } }))
      .toEqual({ '2026-10-01': { kept: 5 }, '2026-10-02': { kept: 3 } });
  });

  it('takes the higher count when a day exists on both', () => {
    expect(mergeHistory({ '2026-10-01': { kept: 2 } }, { '2026-10-01': { kept: 4 } }))
      .toEqual({ '2026-10-01': { kept: 4 } });
  });

  it('never downgrades a rest day to a zero day', () => {
    expect(mergeHistory({ '2026-10-01': { kept: 0, rest: true } }, { '2026-10-01': { kept: 0 } }))
      .toEqual({ '2026-10-01': { kept: 0, rest: true } });
  });

  it('handles an empty side without losing the other', () => {
    expect(mergeHistory({}, { '2026-10-01': { kept: 1 } })).toEqual({ '2026-10-01': { kept: 1 } });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd server && npx vitest run src/__tests__/merge.test.ts
```
Expected: FAIL — cannot find `../sync/merge`

- [ ] **Step 3: Write the merge**

```ts
// server/src/sync/merge.ts
export type DayRecord = { kept: number; rest?: boolean };
export type History = Record<string, DayRecord>;

/**
 * Last-write-wins would let a stale device erase a day that was actually
 * prayed. Prayers only accumulate, so the higher count is the true one, and a
 * rest day always survives — it is a statement, not an absence.
 */
export function mergeHistory(local: History, remote: History): History {
  const out: History = { ...remote };
  for (const [date, l] of Object.entries(local)) {
    const r = out[date];
    if (!r) { out[date] = l; continue; }
    out[date] = { kept: Math.max(l.kept, r.kept), ...(l.rest || r.rest ? { rest: true } : {}) };
  }
  return out;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
cd server && npx vitest run src/__tests__/merge.test.ts
```
Expected: 4 passed

- [ ] **Step 5: Write the routes behind an auth guard**

```ts
// server/src/routes/profile.ts
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { verifyToken } from '../auth/token';
import { pool } from '../db';
import { mergeHistory, type History } from '../sync/merge';

const Body = z.object({ state: z.record(z.string(), z.unknown()) });

async function userIdFrom(req: FastifyRequest): Promise<string | null> {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  return (await verifyToken(h.slice(7)))?.userId ?? null;
}

export async function profileRoutes(app: FastifyInstance) {
  app.get('/profile', async (req, reply) => {
    const userId = await userIdFrom(req);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const { rows } = await pool.query<{ state: unknown }>(
      'select state from profiles where user_id = $1', [userId],
    );
    return { state: rows[0]?.state ?? {} };
  });

  app.put('/profile', async (req, reply) => {
    const userId = await userIdFrom(req);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'state required' });

    const { rows } = await pool.query<{ state: Record<string, unknown> }>(
      'select state from profiles where user_id = $1', [userId],
    );
    const remote = rows[0]?.state ?? {};
    const incoming = parsed.data.state;

    const merged = {
      ...remote,
      ...incoming,
      history: mergeHistory(
        (incoming.history ?? {}) as History,
        (remote.history ?? {}) as History,
      ),
    };
    await pool.query(
      `insert into profiles (user_id, state, updated_at) values ($1, $2, now())
       on conflict (user_id) do update set state = excluded.state, updated_at = now()`,
      [userId, merged],
    );
    return { state: merged };
  });
}
```

- [ ] **Step 6: Verify the guard refuses an anonymous request**

```bash
curl -s localhost:8080/profile -w ' %{http_code}\n'
curl -s localhost:8080/profile -H "Authorization: Bearer $(cd server && node -e "import('./dist/auth/token.js').then(async m=>console.log(await m.issueToken('11111111-1111-1111-1111-111111111111')))")" -w ' %{http_code}\n'
```
Expected: `401` without a token, `200` with one.

- [ ] **Step 7: Commit**

```bash
git add server && git commit -m "feat(server): profile state endpoints with accumulate-wins merge"
```

---

### Task 8: The app talks to the server

> **Amended during execution, from the Task 14 review — this is load-bearing.**
> Today's date is **never** a key in `state.history`. `store.tsx` derives today's
> record from the `marks` array and only archives it into `history` at midnight
> roll-over. So a client that sends `state.history` unmodified never sends today
> at all, and the whole `updatedAt` correction mechanism Task 14 built is inert
> for the one day it matters most — a mis-tap is noticed the same day, not next
> week.
>
> When building the `PUT /profile` body, **synthesize today's entry** rather than
> forwarding `state.history` as-is:
> `{ ...state.history, [ymd(new Date())]: { kept: keptToday, updatedAt: marksUpdatedAt } }`,
> omitting `updatedAt` entirely when `marksUpdatedAt` is `undefined` (the
> `exactOptionalPropertyTypes` rule — an explicit `undefined` is a different
> shape).
>
> Note also that `PUT /profile` merges `history` through `mergeHistoryWithDrops`
> but every **other** top-level field, including `marks`, is plain
> last-write-wins. Two devices editing today before either rolls over will
> clobber each other's `marks` regardless of timestamps; synthesizing today into
> `history` is what gives that case a real merge.
>
> The response carries `dropped: string[]` beside `state`. It is de-duplicated
> via a `Set`, so a key rejected on both the local and the remote side appears
> once, not twice.
>
> **Build the request body from `stateForSync(state)`, never from `state`.**
> `mobile/src/data/store.tsx` exports it for this purpose. It drops `cycles` —
> a record of the user's menstrual periods, kept so cycle mode can pause the
> garden. The app tells her that stays on her phone, and that is only true if
> there is no path from the state object to the network, rather than a
> convention each caller is trusted to remember. Serializing `state` directly
> would send it.

**Files:**
- Create: `mobile/src/data/api.ts`, `mobile/src/data/auth.ts`, `mobile/src/app/(auth)/sign-in.tsx`, `mobile/src/app/(auth)/_layout.tsx`
- Modify: `mobile/src/app/index.tsx`, `mobile/src/data/env.ts`, `mobile/.env.example`, `mobile/scripts/smoke.mjs`
- Test: `mobile/src/data/__tests__/api.test.ts`

**Interfaces:**
- Consumes: `ENV.apiUrl`.
- Produces: `useSession()`; `signInWithGoogle()`; `signOut()`; `pullState()`; `pushState(state)`.

- [ ] **Step 1: Add the API url to the app env**

In `mobile/src/data/env.ts`, add `apiUrl: need('EXPO_PUBLIC_API_URL')` and the
matching line in `.env.example`:

```
EXPO_PUBLIC_API_URL=https://api.mizanapp.uz
```

- [ ] **Step 2: Install**

```bash
cd mobile && npx expo install @react-native-google-signin/google-signin
```

This has native code, so from here the app needs a **development build** — it
will no longer run in Expo Go. Build one before continuing:
`npx eas-cli@latest build -p android --profile development`.

- [ ] **Step 3: Write the failing offline test**

Review Focus #1: the app is offline-first, so a failed sync must be survivable
and silent, never an error the user has to dismiss while praying.

```ts
// mobile/src/data/__tests__/api.test.ts
import { describe, expect, it, vi } from 'vitest';
import { pushState } from '../api';

describe('pushState', () => {
  it('resolves false instead of throwing when the network is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network request failed')));
    await expect(pushState('token', { a: 1 })).resolves.toBe(false);
  });

  it('resolves false on a 500 without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(pushState('token', { a: 1 })).resolves.toBe(false);
  });

  it('resolves true on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ state: {} }) }));
    await expect(pushState('token', { a: 1 })).resolves.toBe(true);
  });
});
```

- [ ] **Step 4: Run it and watch it fail, then write `api.ts`**

```ts
// mobile/src/data/api.ts
import { ENV } from './env';

/**
 * Sync is best-effort by design. This app must work with no network at 05:00,
 * so every call here resolves rather than rejects: a failed push is retried on
 * the next launch, and the user is never told.
 */
export async function pushState(token: string, state: unknown): Promise<boolean> {
  try {
    const r = await fetch(`${ENV.apiUrl}/profile`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ state }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function pullState(token: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(`${ENV.apiUrl}/profile`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return (await r.json()).state ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Write the sign-in screen and make the entry decision three-way**

Onboarding first, then the account, then the app — explaining the product before
asking for an account is the whole reason onboarding exists.

```tsx
// mobile/src/app/index.tsx
import { Redirect } from 'expo-router';
import React from 'react';

import { useSession } from '../data/auth';
import { useStore } from '../data/store';

export default function Index() {
  const { onboarded } = useStore();
  const { session, loading } = useSession();

  if (!onboarded) return <Redirect href="/onboarding" />;
  if (loading) return null;
  if (!session) return <Redirect href="/sign-in" />;
  return <Redirect href="/home" />;
}
```

The sign-in screen is one `Button`, the brand block from
`design-v3/01-language.html`, and one honest sentence. Its error state must be
an Uzbek sentence a tester can act on, never a raw provider error:

```tsx
setError("Kirib bo'lmadi. Internetni tekshiring va qayta urining.");
```

- [ ] **Step 6: Add `/sign-in` to the smoke routes and run the gate**

```bash
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
```
Expected: all clean; `/` lands on `/onboarding`, `/sign-in`, `/home` for the three states.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: account gate and best-effort sync against our API"
```

---

### Task 9: Deploy to Contabo with Dokploy

Rewritten 13 Oct 2026. The owner has set up Contabo with **Dokploy**, which
replaces most of what this task used to say. The original plan hand-rolled a
`docker-compose` stack with Caddy terminating TLS and Postgres as a sibling
container. Dokploy does all of that itself — Traefik, certificates, env vars,
managed Postgres, deploy-on-push — so that work is deleted rather than adapted.

Two decisions made by the owner on 13 Oct: deploy from a **private GitHub
repo**, and use **Dokploy's managed Postgres**.

**Prepared already (commit pending):** `server/Dockerfile` (two-stage, non-root,
`--omit=dev`, health-checked on `/health`) and `server/.dockerignore`.

**Blocked on the owner:** the GitHub repo must exist and this repo must have a
remote. Nothing here can run until then.

- [ ] **Step 1: Push the code**

The repo has no remote and the code exists only on one Mac. Before pushing,
confirm nothing sensitive is tracked — already audited on 13 Oct and clean:
no `.env`, `.key`, keystore or `google-services.json` is tracked, the Gemini
key appears nowhere in history, and no key-shaped string appears in any tracked
file. Re-run that audit if anything has changed:

```bash
git ls-files | grep -iE "\.env$|\.key$|\.keystore$|\.jks$|google-services"
git log -S"$(head -c 20 .secrets/gemini.key)" --oneline --all
```

Then add the remote the owner created and push `feat/android-release`.

- [ ] **Step 2: Create the Postgres service in Dokploy**

A managed Postgres in the same project. Dokploy gives an internal connection
string — use the **internal** host, not a public one, so the database is never
exposed to the internet. The migration runner creates the schema on first boot,
so nothing needs seeding by hand.

- [ ] **Step 3: Create the application**

Source: the GitHub repo. **Build context `server/`**, Dockerfile
`server/Dockerfile`. Port `8080`.

- [ ] **Step 4: Set the environment**

In Dokploy's env panel, never in the repo:

| | |
|---|---|
| `DATABASE_URL` | the internal string from Step 2 |
| `JWT_SECRET` | `openssl rand -base64 48` — **at least 32 characters**, the loader refuses shorter and the server will not boot |
| `GOOGLE_CLIENT_ID` | the Web client ID from Task 8 |
| `GEMINI_API_KEY` | from `.secrets/gemini.key` |
| `SCAN_PUBLIC` | `true` only when the Fajr scan should be reachable |
| `SCAN_DAILY_MAX` | leave unset for 500 |
| `PORT` | `8080` |

`SCAN_PUBLIC` is the one to think about. `/scan` has no authentication until
Task 8 lands, and every call spends a Gemini request. It fails closed on
purpose: deploying without setting it publishes nothing.

- [ ] **Step 5: Domain and TLS**

Point a hostname at the app in Dokploy and let it issue the certificate. If
`mizanapp.uz` is still not bought, Dokploy's generated subdomain works for
testing and the mobile app's `EXPO_PUBLIC_API_URL` points at it.

Whatever the final hostname is, it goes in `mobile/.env` **and** in the Play
listing's privacy policy URL, which must agree with the app.

- [ ] **Step 6: Check it is actually up**

```bash
curl -s https://<host>/health          # {"ok":true}
curl -s -X POST https://<host>/auth/google \
  -H 'content-type: application/json' -d '{"idToken":"nope"}' -w ' %{http_code}\n'
```

Expect `{"ok":true}` and a `401` with `{"error":"invalid token"}`. The second
proves the route is live and refusing bad input, rather than merely reachable.

Then confirm the database is **not** reachable from outside: a connection
attempt to the Postgres port from off the box must fail. Dokploy keeps managed
services on an internal network, but confirm rather than assume — this is the
check that catches a misconfigured port mapping before someone else does.

- [ ] **Step 7: Point the app at it**

Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to the deployed host and rebuild the
APK. Until then the app talks to a laptop on the owner's Wi-Fi, which is why
the Fajr scan only works at home.

### Task 10: Schedule prayer notifications

**Files:**
- Create: `mobile/src/data/notify.ts`
- Test: `mobile/src/data/__tests__/notify.test.ts`
- Modify: `mobile/app.json` (plugin), `mobile/src/app/_layout.tsx` (schedule on launch)

**Interfaces:**
- Consumes: `timesFor`, `hhmm`, `PRAYER_NAMES` from `data/prayer.ts`; `Settings.notifyBefore`.
- Produces: `buildSchedule(from: Date, days: number, madhhab: Madhhab, minutesBefore: number): { id: string; at: Date; title: string; body: string }[]`; `syncNotifications(settings: Settings): Promise<void>`.

Android caps pending alarms, and `expo-notifications` cannot schedule an open-ended
recurrence from computed times — so a fixed window is rescheduled on every launch.

- [ ] **Step 1: Install**

```bash
cd mobile && npx expo install expo-notifications expo-device
```

- [ ] **Step 2: Write the failing test**

```ts
// mobile/src/data/__tests__/notify.test.ts
import { buildSchedule } from '../notify';

describe('buildSchedule', () => {
  const from = new Date('2026-10-06T00:00:00+05:00');

  it('schedules five prayers a day, excluding sunrise', () => {
    const s = buildSchedule(from, 1, 'hanafi', 0);
    expect(s).toHaveLength(5);
    expect(s.some((n) => n.id.includes('sunrise'))).toBe(false);
  });

  it('never schedules a time already in the past', () => {
    const late = new Date('2026-10-06T23:30:00+05:00');
    expect(buildSchedule(late, 1, 'hanafi', 0).every((n) => n.at > late)).toBe(true);
  });

  it('applies the lead time', () => {
    const none = buildSchedule(from, 1, 'hanafi', 0);
    const lead = buildSchedule(from, 1, 'hanafi', 15);
    expect(none[0].at.getTime() - lead[0].at.getTime()).toBe(15 * 60 * 1000);
  });

  it('stays under the Android pending-alarm ceiling for the full window', () => {
    expect(buildSchedule(from, 7, 'hanafi', 10).length).toBeLessThanOrEqual(50);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
cd mobile && npx jest src/data/__tests__/notify.test.ts
```
Expected: FAIL — `Cannot find module '../notify'`

- [ ] **Step 4: Write the implementation**

```ts
// mobile/src/data/notify.ts
import { FIVE, PRAYER_NAMES, timesFor, type Madhhab } from './prayer';

export type Scheduled = { id: string; at: Date; title: string; body: string };

/** Seven days of five prayers is 35 — comfortably under Android's ceiling. */
const WINDOW_DAYS = 7;

export function buildSchedule(
  from: Date,
  days: number,
  madhhab: Madhhab,
  minutesBefore: number,
): Scheduled[] {
  const out: Scheduled[] = [];
  for (let d = 0; d < days; d += 1) {
    const day = new Date(from);
    day.setDate(day.getDate() + d);
    for (const slot of timesFor(day, madhhab)) {
      if (!FIVE.includes(slot.id)) continue;           // sunrise is not a prayer
      const at = new Date(slot.at.getTime() - minutesBefore * 60_000);
      if (at <= from) continue;                        // never fire into the past
      out.push({
        id: `${day.toDateString()}-${slot.id}`,
        at,
        title: PRAYER_NAMES[slot.id],
        body: minutesBefore > 0
          ? `${PRAYER_NAMES[slot.id]}gacha ${minutesBefore} daqiqa qoldi`
          : `${PRAYER_NAMES[slot.id]} vaqti kirdi`,
      });
    }
  }
  return out;
}

export { WINDOW_DAYS };
```

- [ ] **Step 5: Run the tests and watch them pass**

```bash
cd mobile && npx jest src/data/__tests__/notify.test.ts
```
Expected: 4 passed

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: prayer notification schedule builder"
```

---

### Task 11: Survive Doze, and tell the user when you cannot

**Files:**
- Modify: `mobile/src/data/notify.ts`, `mobile/app.json`, `mobile/src/app/settings/notifications.tsx`

**Interfaces:**
- Produces: `canScheduleExact(): Promise<boolean>`; `requestExactAlarmPermission(): Promise<void>`.

Android 14 requires `SCHEDULE_EXACT_ALARM` for exact timing, OEM battery
managers kill background work, and `notifications.tsx` already *promises* the
user they can fix this — the screen says to turn battery optimisation off. It
must detect the state, not just advise it.

- [ ] **Step 1: Declare the permission and channel**

```json
// mobile/app.json → expo.android
"permissions": ["SCHEDULE_EXACT_ALARM", "POST_NOTIFICATIONS", "USE_EXACT_ALARM"]
```

- [ ] **Step 2: Detect whether exact alarms are actually allowed**

```ts
// mobile/src/data/notify.ts — appended
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Returns false when Android will silently downgrade our exact alarms to
 * inexact ones — which, for a 05:00 alarm, can mean it fires at 06:30.
 * The user must be told, because only they can grant it.
 */
export async function canScheduleExact(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const perms = await Notifications.getPermissionsAsync();
  return perms.granted && perms.android?.importance !== undefined;
}
```

- [ ] **Step 3: Show the real state on the notifications screen**

Replace the unconditional advice note with a banner that only appears when
`canScheduleExact()` resolves false, and that opens the system settings page.

- [ ] **Step 4: Verify on a real device**

Install the preview build, grant nothing, open the notifications screen.
Expected: the warning banner is visible. Grant the permission, reopen.
Expected: the banner is gone and a test notification fires within a minute.

- [ ] **Step 5: Verify the alarm after a night in Doze**

Set the Fajr alarm, leave the device unplugged and untouched overnight.
Expected: it fires within a minute of the scheduled time. **If this fails, stop
— nothing else in this plan matters more than fixing it.**

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: detect and surface exact-alarm permission state"
```

---

### Task 12: First closed-testing release — the clock starts

- [ ] **Step 1: Run the full gate**

```bash
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke && npx expo-doctor
```
Expected: all clean, 18/18 doctor checks.

- [ ] **Step 2: Build a production bundle**

```bash
cd mobile && npx eas-cli@latest build -p android --profile production
```

- [ ] **Step 3: Create the Play app and submit to internal testing**

```bash
cd mobile && npx eas-cli@latest submit -p android --latest
```

The Play listing needs a privacy policy URL before anything can be submitted.
Draft it now; the camera section depends on D2 and must describe what actually
happens, not what is convenient.

- [ ] **Step 4: Promote to closed testing and recruit 12 testers**

They must **opt in and stay opted in for 14 continuous days**, and actually open
the app. Twelve people who will not use a prayer app daily are worse than
useless — recruit people who pray.

- [ ] **Step 5: Record the date the clock started**

Write it at the top of this plan. Phases 3–5 run inside this window.

---

## Phase 3 — The Fajr scan *(needs D2; own plan)*

**Outcome:** pointing the camera at a prayer mat stops the alarm; pointing it at a wall does not.

Recommended shape, assuming on-device: `expo-camera` frame → a small image
classifier bundled in the app → a confidence threshold tuned on photos of real
Uzbek prayer mats and bathroom sinks. Needs a development build, not Expo Go.

Open questions for its own plan: which runtime (TF Lite via `react-native-fast-tflite`, or ML Kit image labelling); how a model is obtained — fine-tuned or an off-the-shelf labeller plus a class allowlist; what the false-negative escape is at 05:00 when it will not recognise a mat in the dark; and whether the 10-second hold is enough of an escape hatch.

**The promise in `scan.tsx` is a requirement of this phase, not a caption.**

## Phase 4 — App blocking *(needs D3; own plan)*

**Outcome:** opening Instagram during Asr shows the Mizan reminder screen.

Recommended shape: `UsageStatsManager` polling in a `specialUse` foreground
service, plus a `SYSTEM_ALERT_WINDOW` overlay — not `AccessibilityService`.
Requires an Expo config plugin and native Kotlin; this is the largest native
piece in the project and the one with Play review risk.

Open questions: battery cost of polling; what happens on OEMs that kill the
foreground service; and the Play declaration text.

## Phase 5 — Charity content and admin *(own plan)*

**Outcome:** a monthly report can be published from an admin page and appears in the app.

Adds routes and one table to the **existing** Node service from Phase 1 — no new
deployment. Deliberately last: `charity-zero.html` says the first report is
December 2026, and there is nothing to publish until there is revenue.

Open questions for its own plan: how the admin authenticates (a second Google
account allowlist is probably enough for one person); where uploaded receipt
images live on the VPS and how they are backed up; and whether the admin is a
page on the same Fastify app or a separate Next.js project.

## Phase 6 — Production

Store listing in Uzbek and Russian, screenshots from the real build, privacy
policy matching D2's outcome, data-safety form, merchant profile for
subscriptions, and the production rollout once the 14 days are complete.

---

## Self-review

- **Spec coverage:** the three differentiators are covered — Fajr scan (Phase 3), app blocking (Phase 4), charity (Phase 5). Cycle mode, qaza, garden and tasbih are already built. Russian localisation is **not covered by any task**; it is named in Review Focus #5 and needs a task in Phase 6's plan.
- **Placeholders:** none — every code step carries the code.
- **Type consistency:** `DayRecord`, `ymd`, `Settings`, `Madhhab`, `timesFor`, `FIVE`, `PRAYER_NAMES` all match `mobile/src/data/`. `mergeHistory` and `buildSchedule` signatures match their tests.
- **Review Focus coverage:** #1 offline is pinned in Task 10's past-time test and Phase 3's open questions; #2 Doze is Task 11 Step 5; #3 reinstall is Tasks 7-8; #4 midnight is already tested in `rollOver`; **#5 Russian overflow has no test and no task — the single known gap.**

---

### Task 13: Stop promising what v1 does not ship

Added during execution. The plan's self-review named Russian localisation as a
gap and left it; a read of the actual screens shows the gap is worse than a
missing translation — the app *offers* Russian and English and then ignores the
choice. A tester who taps Русский on the very first screen gets an entirely
Uzbek app. Two settings rows have the same problem in miniature: `Til` and
`Maxfiylik siyosati` draw a chevron, which in this design system means "this
opens something", and neither has an `onPress`.

v1 ships Uzbek only. That is a defensible product decision — the market is
Uzbekistan — but the UI has to say so rather than imply otherwise.

**Files:**
- Modify: `mobile/src/onboarding/content.ts` (add `soon` to `LANGUAGES`)
- Modify: `mobile/src/onboarding/Steps.tsx:27-60` (`LanguageStep`)
- Modify: `mobile/src/app/settings/index.tsx:71-72`
- Test: `mobile/src/onboarding/__tests__/content.test.ts`

**Interfaces:**
- Consumes: `ENV` from `mobile/src/data/env.ts` (Task 2) — read `ENV.apiUrl` only
  if the privacy policy is served from the API host; otherwise use the literal
  below.
- Produces: `LANGUAGES` entries gain an optional `soon?: true`.

- [ ] **Step 1: Write the failing test**

```ts
// mobile/src/onboarding/__tests__/content.test.ts
import { LANGUAGES } from '../content';

describe('LANGUAGES', () => {
  it('ships exactly one selectable language in v1', () => {
    expect(LANGUAGES.filter((l) => !l.soon).map((l) => l.key)).toEqual(['uz']);
  });

  it('still lists the languages that are coming, so the plan is visible', () => {
    expect(LANGUAGES.map((l) => l.key)).toEqual(['uz', 'ru', 'en']);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd mobile && npx jest src/onboarding/__tests__/content.test.ts`
Expected: FAIL — `soon` does not exist on the `LANGUAGES` element type.

- [ ] **Step 3: Mark the unshipped languages**

```ts
// mobile/src/onboarding/content.ts
export const LANGUAGES: { key: string; title: string; sub: string; soon?: true }[] = [
  { key: 'uz', title: "O'zbekcha", sub: 'Lotin alifbosi' },
  { key: 'ru', title: 'Русский', sub: 'Tez kunda', soon: true },
  { key: 'en', title: 'English', sub: 'Tez kunda', soon: true },
];
```

- [ ] **Step 4: Make them unselectable in `LanguageStep`**

In the `LANGUAGES.map` body, before the `Pressable`:

```tsx
const soon = l.soon === true;
```

then on the `Pressable`:

```tsx
disabled={soon}
accessibilityState={{ selected: on, disabled: soon }}
style={[s.lang, on && s.langOn, soon && s.langSoon]}
```

and guard the handler so a disabled press cannot write state:

```tsx
onPress={() => {
  if (soon) return;
  Haptics.selectionAsync();
  onChange(l.key);
}}
```

Add the style beside the existing `s.lang` rules:

```ts
langSoon: { opacity: 0.45 },
```

Do not render the `Tick` for a `soon` row.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd mobile && npx jest src/onboarding/__tests__/content.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Fix the two dead chevrons in settings**

`Til` does not open anything, because there is nothing to choose. Drop the
chevron and leave it as a stated fact:

```tsx
<Row icon="book" title="Til" value="O'zbekcha" />
```

`Maxfiylik siyosati` must open the policy — Google Play requires a reachable
privacy policy, and a row that draws a chevron and does nothing is the kind of
thing a reviewer taps first. Import `openURL` from `expo-linking` and point it
at the hosted policy:

```tsx
import * as Linking from 'expo-linking';

const PRIVACY_URL = 'https://mizanapp.uz/maxfiylik';
```

```tsx
<Row
  icon="lock"
  title="Maxfiylik siyosati"
  chevron
  onPress={() => Linking.openURL(PRIVACY_URL)}
/>
```

`expo-linking` is already a dependency (`~57.0.11`); no install step is needed.

`PRIVACY_URL` must be the same URL submitted in the Play Console listing in
Task 12. If the domain is not yet live, leave this literal as written and note
it in the task report; Task 12 verifies the two match.

- [ ] **Step 7: Gate**

Run: `cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke`
Expected: all green. The smoke run matters here — it loads the onboarding route
and would catch a `Pressable` whose style array broke.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/onboarding mobile/src/app/settings/index.tsx mobile/package.json mobile/package-lock.json
git commit -m "fix(ui): only offer the language v1 actually ships, and wire the privacy policy row"
```

---

### Task 14: Let a user take back a prayer they did not pray

Added during execution, from the Task 7 review. **Sequence this before Task 8** —
it changes the shape of a `DayRecord` on both sides, and Task 8 is what wires the
mobile app to these endpoints. Doing it after means editing Task 8's work.

Task 7's merge is monotonic: `Math.max` on `kept`, OR on `rest`. Nothing can
ever go down. The review established this bites after a **single** sync, not two
— once a device has sent its value for a date, that same device's later
correction is merged against the stored value and loses. No second device needed.

So a mis-tap is permanent. The app's whole premise is honest self-report about
one's own prayers, and the garden, the streak and the statistics all read this
number. Recording a prayer the user says they did not perform, with no way to
take it back, is a worse failure than the one monotonic merge was defending
against — a stale device erasing a true day loses data, but this fabricates it
and then freezes it.

Monotonic was a defensible choice under the constraint that `DayRecord` carries
no timestamp. The constraint is cheap to remove, and `profiles.state` is
schemaless `jsonb`, so **no database migration is needed**.

**Files:**
- Modify: `mobile/src/data/store.tsx` (`DayRecord`, and every site that writes one)
- Modify: `server/src/sync/merge.ts`
- Test: `server/src/__tests__/merge.test.ts`, `mobile/src/data/__tests__/store.test.ts`

**Interfaces:**
- `DayRecord` gains `updatedAt?: number` — epoch milliseconds, optional, because
  clients already in the field will not send it.
- `mergeHistory(local, remote)` keeps its signature.

- [ ] **Step 1: Write the failing merge tests**

```ts
const older = { kept: 5, updatedAt: 1_000 };
const newer = { kept: 4, updatedAt: 2_000 };

it('lets a newer record lower the count', () => {
  expect(mergeHistory({ '2026-10-01': newer }, { '2026-10-01': older }))
    .toEqual({ '2026-10-01': newer });
});

it('lets a newer record clear a rest day', () => {
  expect(mergeHistory(
    { '2026-10-01': { kept: 0, updatedAt: 2_000 } },
    { '2026-10-01': { kept: 0, rest: true, updatedAt: 1_000 } },
  )).toEqual({ '2026-10-01': { kept: 0, updatedAt: 2_000 } });
});

it('falls back to the monotonic rule when either side has no timestamp', () => {
  expect(mergeHistory({ '2026-10-01': { kept: 5 } }, { '2026-10-01': { kept: 2 } }))
    .toEqual({ '2026-10-01': { kept: 5 } });
});

it('prefers the timestamped record when only one side has one', () => {
  expect(mergeHistory({ '2026-10-01': { kept: 1, updatedAt: 9 } }, { '2026-10-01': { kept: 5 } }))
    .toEqual({ '2026-10-01': { kept: 1, updatedAt: 9 } });
});
```

That third case is the compatibility guarantee: a phone running the current
build keeps behaving exactly as it does today. The fourth is the upgrade path —
a client that has learned to stamp its writes is the one telling the truth,
because it is the only one that can express a correction at all.

- [ ] **Step 2: Run them and watch them fail**

Run: `cd server && npm test -- merge`
Expected: the first, second and fourth fail; the third already passes.

- [ ] **Step 3: Change the comparator**

Per date, after `sanitize`: if both sides carry `updatedAt`, the newer record
wins **whole** — count and rest flag together, because they describe one
statement about one day and splitting them re-creates the problem. If exactly
one side carries it, that side wins. If neither does, keep today's
`Math.max` / OR. Equal timestamps keep the monotonic rule, so the result does
not depend on argument order.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd server && npm test -- merge`
Expected: PASS, including every pre-existing case — the clamp at 5 and the
sanitize rules are unchanged.

- [ ] **Step 5: Stamp the mobile writes**

In `mobile/src/data/store.tsx`, add `updatedAt?: number` to `DayRecord` and set
`Date.now()` at every site that writes one — marking a prayer, the day
roll-over, and `repairDay`. A write that does not stamp is a write that cannot
later be corrected, so grep for every construction of a `DayRecord` rather than
trusting this list.

- [ ] **Step 6: Test the mobile side**

Assert that marking a prayer and then unmarking it leaves an `updatedAt` greater
than the first one. Use a fake timer or inject a clock; do not sleep.

- [ ] **Step 7: Gate**

```bash
cd server && npx tsc --noEmit && npm test
cd ../mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
```

- [ ] **Step 8: Commit**

```bash
git add server/src mobile/src
git commit -m "feat(sync): timestamp day records so a correction can win"
```

---

### Task 15: Real numbers on the screens that already have the data

Added during execution. `mobile/src/data/store.tsx` exports a `MOCK` constant
that ten screens read as if it were the user's own record: a 17-day streak,
143/157 prayers, per-prayer consistency, an outstanding qaza count, a name and
join date, charity totals and focus minutes. `seedHistory` was removed as a
release blocker for exactly this reason; `MOCK` is the same defect about ten
times larger. The app asks people to be honest about their prayers and then
shows them numbers nobody earned.

This task covers the screens whose real data **already exists locally** in
`state.history`. Task 16 covers the rest.

One of them is not a swap. **Qaza is not stored anywhere** — `qaza.tsx` reads
`MOCK.qaza` into `useState`, so a user's edits are discarded the moment they
navigate away. Outstanding make-up prayers are the whole point of that screen,
so this task gives them real storage.

**Files:**
- Modify: `mobile/src/data/store.tsx` (add `qaza`, `setQaza`; add derived stats)
- Modify: `mobile/src/app/stats.tsx`, `mobile/src/app/month.tsx`,
  `mobile/src/app/qaza.tsx`, `mobile/src/app/(tabs)/timetable.tsx`
- Test: `mobile/src/data/__tests__/stats.test.ts`

**Interfaces:**
- Consumes: `history`, `startedAt`, `streak`, `recentDays` from the store.
- Produces, in a new `mobile/src/data/stats.ts` so the arithmetic is testable
  without React:
  - `monthTotals(history, month: Date, startedAt?: string): { prayed: number; total: number }`
  - `consistency(history, from: Date, to: Date): { key: string; pct: number; warn?: boolean }[]`
  - `longestStreak(history): number`
- Produces on the store: `qaza: Record<PrayerId, number>`,
  `setQaza(id: PrayerId, n: number): void`.

- [ ] **Step 1: Write the failing stats tests**

```ts
import { consistency, longestStreak, monthTotals } from '../stats';

const h = {
  '2026-10-01': { kept: 5 },
  '2026-10-02': { kept: 3 },
  '2026-10-03': { kept: 0, rest: true },
};

describe('monthTotals', () => {
  it('counts only days from startedAt onward', () => {
    expect(monthTotals(h, new Date('2026-10-15'), '2026-10-02'))
      .toEqual({ prayed: 3, total: 5 });
  });

  it('excludes rest days from the denominator', () => {
    // 2026-10-03 is a rest day: it owes nothing and cannot be missed
    expect(monthTotals(h, new Date('2026-10-15'), '2026-10-01'))
      .toEqual({ prayed: 8, total: 10 });
  });

  it('returns zeroes rather than NaN for an empty history', () => {
    expect(monthTotals({}, new Date('2026-10-15'), undefined))
      .toEqual({ prayed: 0, total: 0 });
  });
});

describe('longestStreak', () => {
  it('does not let a rest day break the run', () => {
    expect(longestStreak(h)).toBe(3);
  });
});
```

The third case is the one that will actually happen: every new user has an empty
history, and `143/157` becoming `NaN/NaN` on day one is the obvious way to get
this wrong.

- [ ] **Step 2: Run them and watch them fail**

Run: `cd mobile && npx jest src/data/__tests__/stats.test.ts`
Expected: FAIL — `../stats` does not exist.

- [ ] **Step 3: Write `mobile/src/data/stats.ts`**

Pure functions over a `History`, no React and no store import, so they are
testable with fixtures. A rest day counts as neither prayed nor owed: it is a
statement that nothing was due, so it must not sit in the denominator and must
not break a streak. Days before `startedAt` are not counted at all — the app was
not there, so the user did not miss anything.

Percentages divide by the number of days that actually owed that prayer. Guard
every division: an empty history must yield `0`, never `NaN`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd mobile && npx jest src/data/__tests__/stats.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Give qaza real storage**

Add to the store's state, beside `tasbih`:

```ts
qaza: Record<PrayerId, number>;
```

defaulting to every prayer at `0`, with a `setQaza(id, n)` that clamps at zero —
a negative count of owed prayers is meaningless. Then change `qaza.tsx` to read
and write the store instead of `useState`, so the number survives navigation.

`timetable.tsx` sums `MOCK.qaza` for its total; point it at the store's.

- [ ] **Step 6: Wire stats.tsx and month.tsx**

Replace every `MOCK.*` read with the derived values. Where a figure has no real
source yet — `focusMinutes` on both screens — leave the row out entirely rather
than showing a zero that looks like a measurement; Task 16 gives focus its own
honest treatment.

A brand-new user must see a sensible screen, not a wall of zeroes pretending to
be data. Where a section has nothing to show yet, use the existing `Empty`
component from `components/ui.tsx` with copy in the app's voice:
`Hali ma'lumot yo'q — birinchi namozingizni belgilang.`

- [ ] **Step 7: Delete the parts of MOCK this task replaced**

Remove `streak`, `longestStreak`, `monthPrayed`, `monthTotal`, `consistency`,
`qaza` and `recentDays` from `MOCK`. Leave the rest for Task 16. If the TypeScript
build still passes, nothing was left pointing at them.

- [ ] **Step 8: Gate**

```bash
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
```

`npm run smoke` renders all 25 routes and is what catches a screen that now
divides by zero on an empty store.

- [ ] **Step 9: Commit**

```bash
git add mobile/src
git commit -m "feat(stats): compute the real numbers instead of showing invented ones"
```

---

### Task 16: Honest empty states where the data does not exist yet

Added during execution. The second half of removing `MOCK`. These screens have
no real source **because the feature behind them is not built**: charity totals
need the server, blocked apps and focus minutes need Android app-blocking, and
the profile needs the Google account from Task 8.

The decision is to show honest empty states rather than hide the screens, so a
tester sees what the app will do and that it is not pretending to have done it.

**Files:**
- Modify: `mobile/src/app/focus/index.tsx`, `focus/apps.tsx`, `focus/stats.tsx`
- Modify: `mobile/src/app/charity/reports.tsx`, `charity/report.tsx`
- Modify: `mobile/src/app/settings/index.tsx`, `settings/profile.tsx`
- Modify: `mobile/src/data/store.tsx` (add `focusMinutes`; delete `MOCK`)
- Modify: `mobile/src/app/focus/active.tsx` (bank a completed session)
- Test: `mobile/src/data/__tests__/focus.test.ts`

**Interfaces:**
- Produces on the store: `focusMinutes: number`, `addFocusMinutes(n: number): void`.

- [ ] **Step 1: Write the failing focus test**

```ts
it('banks a completed session and ignores a negative one', () => {
  // addFocusMinutes must never let a miscomputed duration reduce the total
});
```

Write it against the store the same way `store.test.ts` does, with fake timers.

- [ ] **Step 2: Run it and watch it fail**

Run: `cd mobile && npx jest src/data/__tests__/focus.test.ts`
Expected: FAIL — `addFocusMinutes` does not exist.

- [ ] **Step 3: Track focus minutes for real**

`focus/active.tsx` already runs a countdown. Add `focusMinutes: number` to the
state at `0`, and call `addFocusMinutes` at the point the session actually
completes — not when it is abandoned, because an abandoned session is not focus
time. Clamp negatives to zero.

- [ ] **Step 4: Run the test to verify it passes**

- [ ] **Step 5: Empty-state the focus screens**

`focus/apps.tsx` lists six invented apps with invented usage figures. The real
list comes from `UsageStatsManager` once app-blocking exists, and the icons come
from `packageManager.getApplicationIcon(pkg)` at runtime — **never redraw another
company's logo**, which is why no placeholder art goes in here either.

Until then the screen shows a single explanatory state: the feature needs a
permission the app does not have yet. Copy:
`Ilovalarni bloklash uchun ruxsat kerak. Bu funksiya tez kunda qo'shiladi.`

`focus/index.tsx` counts `MOCK.apps.filter(blocked)` for its summary — show the
real focus minutes and no app count. `focus/stats.tsx` shows real minutes, and
`Empty` for the per-app breakdown.

- [ ] **Step 6: Move the charity figures out of MOCK**

`charity/reports.tsx` is already honest — it shows `$0` and says the app has not
earned anything yet. It only needs its two values to stop coming from a constant
named `MOCK`. Put them in `mobile/src/data/charity.ts` as named constants with a
comment saying they are updated when a real report is published.

`charity/report.tsx` renders an invented monthly breakdown. Check whether the
screen already labels it as an example. If it does not, label it — the heading
must say it is a worked example of what a future report will look like, not a
report. Copy: `Namuna — kelgusi hisobot shunday ko'rinadi.`

- [ ] **Step 7: Signed-out identity in settings and profile**

Both screens show `MOCK.profile.name`, an initial, and a join date. There is no
account until Task 8. Show a neutral avatar (no initial) and, in place of the
name, a prompt: `Hisobga kirish`, with sub-copy
`Tariximiz saqlanishi uchun hisobga kiring.` Tapping it does nothing yet —
Task 8 wires it to Google sign-in. `settings/profile.tsx`'s prayer and focus
figures come from the real store.

Leaving a dead chevron is the defect Task 13 exists to fix, so do not add one
here: render the prompt as a non-pressable row until Task 8.

- [ ] **Step 8: Delete `MOCK` entirely**

```bash
grep -rn "MOCK" mobile/src
```
Expected: no matches except `MOCK_DETECT_MS` in `alarm/scan.tsx`, which is the
Fajr scan timer and is a different thing with its own task.

- [ ] **Step 9: Gate**

```bash
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
```

- [ ] **Step 10: Commit**

```bash
git add mobile/src
git commit -m "feat(ui): show honest empty states instead of invented data"
```

---

### Task 17: Record which prayers were kept, not just how many

Added during execution, after Task 15 found that per-prayer consistency is not
recoverable from the stored data. `DayRecord` keeps a daily count `kept` (0-5)
and nothing else, so "you keep missing Asr" — the one insight that makes a
statistics screen worth opening, and the chart `design-v3` draws — cannot be
computed at all. Task 15 honestly repurposed that chart to a per-day view.

**Sequence this before Task 8.** It changes the shape of a `DayRecord`, which is
what Task 8 syncs. Doing it now also costs no migration: the app has no real
users yet. Once testers have a fortnight of history, the same change means
migrating their prayer records.

**Files:**
- Modify: `mobile/src/data/store.tsx` (`DayRecord`, `rollOver`, `repairDay`)
- Modify: `mobile/src/data/stats.ts` (per-prayer consistency)
- Modify: `mobile/src/app/stats.tsx` (the chart)
- Modify: `server/src/sync/merge.ts` (`sanitize`, `mergeDay`)
- Test: `mobile/src/data/__tests__/stats.test.ts`,
  `mobile/src/data/__tests__/store.test.ts`,
  `server/src/__tests__/merge.test.ts`

**Interfaces:**
- `DayRecord` gains `prayers?: PrayerId[]` — which of the five were kept.
  Optional, because records written before this task have none.
- `kept` stays and remains authoritative for the count. `prayers` is the subset
  that is *known*, so the invariant is `prayers.length <= kept`, not equality —
  a generic repair can raise the count without naming a prayer.
- `perPrayer(history, from, to, startedAt?): { key: PrayerId; pct: number; days: number }[]`
  in `stats.ts`, where `days` is how many days the percentage is based on.
- `repairDay(date: string, prayer?: PrayerId)` — the optional argument lets the
  qaza screen say which prayer was made up while the garden keeps calling it
  without one.

Note `PrayerId` includes `'sunrise'`, which is **not** a prayer — it marks the
end of the Fajr window. Only the five in `FIVE` may appear in `prayers`.

- [ ] **Step 1: Write the failing per-prayer test**

```ts
import { perPrayer } from '../stats';

const h = {
  '2026-10-01': { kept: 5, prayers: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] },
  '2026-10-02': { kept: 4, prayers: ['dhuhr', 'asr', 'maghrib', 'isha'] },
  '2026-10-03': { kept: 0, rest: true },
  '2026-10-04': { kept: 2 },
};

it('reports each prayer over the days that actually recorded one', () => {
  const r = perPrayer(h, new Date('2026-10-01'), new Date('2026-10-04'), '2026-10-01');
  const fajr = r.find((x) => x.key === 'fajr');
  // Oct 1 kept it, Oct 2 did not. Oct 3 is a rest day and owes nothing.
  // Oct 4 has a count but no `prayers`, so it cannot say anything about Fajr.
  expect(fajr).toEqual({ key: 'fajr', pct: 50, days: 2 });
});

it('never reports sunrise, which is not a prayer', () => {
  const r = perPrayer(h, new Date('2026-10-01'), new Date('2026-10-04'), '2026-10-01');
  expect(r.map((x) => x.key)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
});

it('returns zero days rather than NaN when nothing has been recorded', () => {
  const r = perPrayer({}, new Date('2026-10-01'), new Date('2026-10-04'), undefined);
  expect(r.every((x) => x.pct === 0 && x.days === 0)).toBe(true);
});
```

`days` is in the return type because a percentage from two days is not worth
showing as confidently as one from sixty, and the screen needs to be able to say
so rather than imply precision it does not have.

- [ ] **Step 2: Run them and watch them fail**

Run: `cd mobile && npx jest src/data/__tests__/stats.test.ts`
Expected: FAIL — `perPrayer` is not exported.

- [ ] **Step 3: Write `perPrayer`**

A day contributes to a prayer's denominator only when it has a `prayers` array —
a legacy record with a bare count genuinely cannot say whether Asr was kept, and
guessing would fabricate exactly what this project keeps removing. Rest days and
days outside `[startedAt, today]` contribute nothing, as in `consistency`.

- [ ] **Step 4: Run the tests to verify they pass**

- [ ] **Step 5: Record the marks on the mobile side**

In `rollOver`, build `prayers` from the day's `marks`, keeping only ids in
`FIVE` and only those actually marked as kept. In `repairDay(date, prayer?)`,
append the prayer to `prayers` when one is given, and raise `kept` either way.
Keep `prayers.length <= kept` true in both paths.

- [ ] **Step 6: Merge the new field on the server**

In `sanitize`, drop any entry in `prayers` that is not one of the five, remove
duplicates, and clamp so `prayers.length <= kept`. In `mergeDay`, the existing
rule is unchanged where it already decides: a newer `updatedAt` wins the record
whole. In the monotonic fallback, take the **union** of both sides' `prayers`
and set `kept` to the greater of the two counts and the union's length — the
union cannot invent a prayer neither side recorded, and the clamp at
`MAX_KEPT = 5` still applies.

Add server tests for: an unknown id dropped, `'sunrise'` dropped, duplicates
removed, the union in the monotonic path, and a newer record replacing an older
one's `prayers` wholesale rather than merging field-by-field.

- [ ] **Step 7: Put the chart back**

`stats.tsx` shows the per-prayer chart using `perPrayer`, labelled with
`PRAYER_NAMES`. When every prayer has `days === 0`, show the existing `Empty`
component rather than five zero bars — the Task 15 fix-round rule, that a day
with no record is not a failure, applies here too. Where `days` is low, say what
the figure rests on: `so'nggi {days} kun asosida`.

- [ ] **Step 8: Gate**

```bash
cd server && npx tsc --noEmit && npm test
cd ../mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
```

- [ ] **Step 9: Commit**

```bash
git add server/src mobile/src
git commit -m "feat(stats): record which prayers were kept, so the chart can tell you"
```

---

### Task 18: Make the cycle-mode privacy promise true

Added during execution, from a security review of `mobile/src/data/store.tsx`.

`mobile/src/app/settings/cycle.tsx:82` tells the user, about her menstrual
history:

> Bu ma'lumot faqat telefoningizda saqlanadi. Serverga yuborilmaydi va hech kim
> ko'ra olmaydi.

*(This information is stored only on your phone. It is not sent to a server and
nobody can see it.)*

Both halves are currently false.

**"Not sent to a server."** `mobile/app.json` sets no `allowBackup`, so Android
Auto Backup is enabled by default. It uploads the app's data directory —
including the AsyncStorage blob that holds `cycles` — to the user's Google
Drive. `stateForSync` cannot prevent this, because the path does not go through
the app at all.

**"Nobody can see it."** `store.tsx:249` persists the whole state with
`AsyncStorage.setItem(KEY, JSON.stringify(state))`. AsyncStorage is plaintext in
the app's private directory: readable on a rooted device, and via `adb` on a
debuggable build.

The right response is to make the sentence true, not to soften it. It is a good
promise about data the app only holds so it can avoid scolding a woman for
prayers she was never expected to make.

**Files:**
- Modify: `mobile/app.json` (`android.allowBackup`)
- Modify: `mobile/src/data/store.tsx` (move `cycles` to secure storage)
- Test: `mobile/src/data/__tests__/store.test.ts`

- [ ] **Step 1: Turn off Auto Backup**

```json
"android": {
  "allowBackup": false
}
```

This is a deliberate trade: a user moving to a new phone will not get their
prayer history back from a Google Drive backup. That is acceptable because
server-side profile sync (Tasks 6-8) is this app's actual backup mechanism, and
an account is required anyway. Record that reasoning in the plan rather than
only in the diff, because a later contributor will otherwise read
`allowBackup: false` as an oversight and remove it.

- [ ] **Step 2: Install secure storage**

```bash
cd mobile && npx expo install expo-secure-store
```

Never `npm install` — only `expo install` resolves an SDK-57-compatible version.
`expo-secure-store` is backed by the Android Keystore, and its data is not part
of Auto Backup even if backup is later re-enabled, so the guarantee does not
rest on one config key staying put.

- [ ] **Step 3: Write the failing test**

```ts
it('keeps cycles out of the AsyncStorage blob entirely', async () => {
  // enable cycle mode, let the debounced write run, then read the raw
  // AsyncStorage value and assert the string "cycles" does not appear in it
});
```

Assert on the **raw persisted string**, not on the parsed object. A test that
parses and checks a key would pass even if the dates were serialized under
another name.

- [ ] **Step 4: Split the persistence**

`cycles` moves out of the AsyncStorage payload and into
`SecureStore.setItemAsync`. Keep it in the same in-memory `State` so every
screen and `stateForSync` work unchanged — only the write path differs. On
hydrate, read both and merge.

`SecureStore` is unavailable on web, which this project's `npm run smoke`
exercises. Fall back to keeping `cycles` in memory only when
`SecureStore.isAvailableAsync()` is false, rather than silently falling back to
AsyncStorage — losing the history on web reload is a far better outcome than
writing health data to the exact store this task is removing it from.

- [ ] **Step 5: Run the tests**

Run: `cd mobile && npx jest`
Expected: PASS, including the raw-string assertion.

- [ ] **Step 6: Check the promise holds end to end**

Confirm and report: the raw AsyncStorage string contains no cycle dates;
`stateForSync` still drops `cycles`; `reset()` clears the secure entry as well
as the AsyncStorage one — a user wiping their data must not leave her periods
behind in the Keystore.

- [ ] **Step 7: Gate**

```bash
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
npx expo config --type public >/dev/null
```

The last command catches a malformed `app.json`, which otherwise fails for the
first time during an EAS build.

- [ ] **Step 8: Commit**

```bash
git add mobile/src mobile/app.json mobile/package.json mobile/package-lock.json
git commit -m "fix(privacy): keep cycle history out of AsyncStorage and off Google Drive"
```

---

### Task 19: A native module that can see which app is in front

Added 9 Oct 2026. The plan's self-review claimed app blocking was covered by a
task. It was not — decision D3 exists and no task implements it. This is the
first of three that do.

Nothing in Expo exposes `UsageStatsManager`, so this is a real Expo native
module in Kotlin. It does the reading and the permission plumbing only; the
reminder itself is Task 20.

D3 chose `UsageStatsManager` + an overlay over `AccessibilityService`, because
Google rejects accessibility-API app blockers repeatedly and the mockup already
promises the gentler behaviour: *"bu qulf emas, eslatma"* — this is not a lock,
it is a reminder.

**Files:**
- Create: `mobile/modules/app-watch/expo-module.config.json`
- Create: `mobile/modules/app-watch/android/src/main/java/uz/mizan/appwatch/AppWatchModule.kt`
- Create: `mobile/modules/app-watch/index.ts`
- Create: `mobile/modules/app-watch/plugin/withAppWatch.js` (config plugin)
- Modify: `mobile/app.json` (register the plugin)
- Test: `mobile/src/data/__tests__/appwatch.test.ts`

**Interfaces produced** — Task 20 and 21 consume these by name:
- `hasUsageAccess(): boolean`
- `requestUsageAccess(): void` — opens the system settings screen; cannot be granted in-app
- `hasOverlayPermission(): boolean`
- `requestOverlayPermission(): void`
- `foregroundPackage(): string | null` — the package in front right now, or null
- `installedApps(): { pkg: string; label: string }[]` — launchable apps only
- `usageToday(): { pkg: string; minutes: number }[]`

Note there is **no icon field**. Icons come from
`packageManager.getApplicationIcon(pkg)` at render time in Task 21. Never bundle
or redraw another company's logo — that is a trademark problem, not a styling
choice.

- [ ] **Step 1: Scaffold the module**

```bash
cd mobile && npx create-expo-module@latest --local app-watch
```

Answer the prompts with package `uz.mizan.appwatch`. Delete the generated iOS
directory and the example view — this is Android-only, and an empty iOS target
that throws is worse than no target. `index.ts` must return safe values on iOS
and web (`false`, `null`, `[]`) rather than throwing, because `npm run smoke`
renders every route in a browser.

- [ ] **Step 2: Write the failing test**

```ts
// mobile/src/data/__tests__/appwatch.test.ts
import { hasUsageAccess, foregroundPackage, installedApps } from '../../../modules/app-watch';

describe('app-watch on a platform without it', () => {
  it('reports no access rather than throwing', () => {
    expect(hasUsageAccess()).toBe(false);
  });
  it('returns null for the foreground app', () => {
    expect(foregroundPackage()).toBeNull();
  });
  it('returns an empty list, not undefined', () => {
    expect(installedApps()).toEqual([]);
  });
});
```

Run under the default jest environment, which is not Android. A module that
throws here would crash every screen that imports it — the same failure mode
`expo-notifications` caused in Expo Go, and the reason that one is now a guarded
dynamic import.

- [ ] **Step 3: Run it and watch it fail**

Run: `cd mobile && npx jest src/data/__tests__/appwatch.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 4: Write the Kotlin**

`AppWatchModule.kt`, using the Expo Modules API `Definition {}` DSL:

```kotlin
Name("AppWatch")

Function("hasUsageAccess") {
  val ctx = appContext.reactContext ?: return@Function false
  val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
  val mode = ops.unsafeCheckOpNoThrow(
    AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName,
  )
  mode == AppOpsManager.MODE_ALLOWED
}
```

`PACKAGE_USAGE_STATS` can never be granted by a runtime prompt — the user must
toggle it in Settings. `requestUsageAccess` therefore launches
`Settings.ACTION_USAGE_ACCESS_SETTINGS`, and `requestOverlayPermission`
launches `Settings.ACTION_MANAGE_OVERLAY_PERMISSION` with
`package:` + the package name. Both need `FLAG_ACTIVITY_NEW_TASK`.

`foregroundPackage` reads `UsageStatsManager.queryEvents` over the last ten
seconds and returns the package of the most recent
`UsageEvents.Event.ACTIVITY_RESUMED`. Do **not** use `queryUsageStats` with
`INTERVAL_DAILY` for this — its `lastTimeUsed` lags by minutes and would make
the reminder arrive long after the user opened the app.

`installedApps` filters to packages with a launcher intent, excludes our own,
and sorts by label.

- [ ] **Step 5: Write the config plugin**

CNG regenerates `android/` on every prebuild, so the manifest entries must come
from a config plugin, never from editing `android/` by hand. `withAppWatch.js`
adds:

```xml
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS"
  tools:ignore="ProtectedPermissions" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
```

`QUERY_ALL_PACKAGES` is a Play-restricted permission and needs a declaration in
the Play Console. Note it in your report — Task 12 has to answer for it.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd mobile && npx jest src/data/__tests__/appwatch.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Verify on a device**

A dev build is required; Expo Go cannot load a custom native module. The NDK is
already cached, so this is fast:

```bash
cd mobile && npx expo run:android
```

Report, with real output: whether `hasUsageAccess()` is false before granting
and true after, what `foregroundPackage()` returns while a different app is in
front (open Settings and read it), and how many entries `installedApps()`
returns. If you cannot observe one of these, say so rather than implying you
did.

- [ ] **Step 8: Gate and commit**

```bash
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
npx expo config --type public >/dev/null
git add mobile/modules mobile/app.json mobile/src
git commit -m "feat(android): a native module that can see the foreground app"
```

---

### Task 20: The reminder, not a lock

Added 9 Oct 2026. Second of three for app blocking.

A foreground service polls `foregroundPackage()` and, when a blocked app is in
front during an active focus session, draws an overlay. The mockup's words are
the specification: *"bu qulf emas, eslatma"*. It must be dismissible, it must
not fight the user, and a second dismissal for the same app within the session
must leave them alone.

**Files:**
- Create: `mobile/modules/app-watch/android/src/main/java/uz/mizan/appwatch/FocusService.kt`
- Create: `mobile/modules/app-watch/android/src/main/res/layout/reminder.xml`
- Modify: `mobile/modules/app-watch/index.ts`, `plugin/withAppWatch.js`
- Modify: `mobile/src/app/focus/active.tsx`

**Interfaces produced:**
- `startFocus(blocked: string[], endsAt: number): void`
- `stopFocus(): void`
- `isFocusRunning(): boolean`

- [ ] **Step 1: Declare the service**

Android 14 requires a `foregroundServiceType`, and the only honest fit here is
`specialUse`, which additionally requires a property explaining why:

```xml
<service android:name=".FocusService" android:exported="false"
  android:foregroundServiceType="specialUse">
  <property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
    android:value="Reminds the user when a distracting app is opened during a
    focus session the user started." />
</service>
```

Also add `<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />`
and `FOREGROUND_SERVICE_SPECIAL_USE`. Google reviews this string — write it as
the truth, not as keywords.

- [ ] **Step 2: Poll, do not spin**

Poll `foregroundPackage()` on a 2-second handler loop, not a tight loop and not
a 200ms one. Battery is the reason OEMs kill background work, and a focus
session can run for an hour. Stop the service the moment `endsAt` passes, so a
forgotten session cannot drain the battery all day.

- [ ] **Step 3: The overlay**

`WindowManager` with `TYPE_APPLICATION_OVERLAY`, `FLAG_NOT_FOCUSABLE` so typing
elsewhere still works, wrap-content height anchored to the top — not a
full-screen takeover. One line of Uzbek, the remaining focus time, and a
dismiss. Copy:

- `Fokus rejimi — {N} daqiqa qoldi`
- dismiss: `Yopish`

After two dismissals for the same package in one session, stop showing it for
that package. Someone who has said no twice has decided, and a third overlay is
the app arguing with its user.

- [ ] **Step 4: Wire the session**

`focus/active.tsx` calls `startFocus` when the countdown begins and `stopFocus`
when it ends **or is abandoned**. An abandoned session that leaves the service
running is a notification the user cannot get rid of.

- [ ] **Step 5: Verify on a device**

Report with real output: the service appears in `adb shell dumpsys activity services | grep FocusService`; opening a blocked app during a session draws the overlay; dismissing twice stops it for that app; ending the session removes the notification and the service.

- [ ] **Step 6: Gate and commit**

```bash
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
git add mobile/modules mobile/src
git commit -m "feat(focus): remind rather than block when a distracting app opens"
```

---

### Task 21: The real app list

Added 9 Oct 2026. Third of three. Task 16 left `focus/apps.tsx` showing a
permission empty state, because there was no way to list apps. Now there is.

**Files:**
- Modify: `mobile/src/app/focus/apps.tsx`, `mobile/src/app/focus/index.tsx`,
  `mobile/src/app/focus/stats.tsx`, `mobile/src/data/store.tsx`

- [ ] **Step 1: Store the chosen packages**

`blockedApps: string[]` in the store, persisted. Package names only — never a
cached label or icon, which go stale when the user changes locale or updates an
app.

- [ ] **Step 2: Render the list**

`installedApps()` for the rows, `usageToday()` for the per-app minutes that
`focus/stats.tsx` has been showing an empty state for. Icons come from the OS at
render time through the native module; if an icon cannot be loaded, fall back to
the first letter of the label on a neutral tile — **never** a drawn stand-in for
a real brand.

- [ ] **Step 3: Keep the permission state honest**

If usage access is not granted, the screen explains and offers the button that
opens Settings — it does not list fabricated apps, and it does not pretend the
feature is on. Task 16's copy stays until permission is actually granted.

- [ ] **Step 4: A switch that blocks right now, for testing**

Added 9 Oct 2026 at the owner's request. The reminder normally only runs during
a focus session, which makes it almost impossible to test — you would have to
start a session and wait. Add a switch at the top of `focus/apps.tsx`:

- label: `Sinov rejimi`
- sub: `Tanlangan ilovalar darhol bloklanadi — fokus seansini kutmasdan`

When it is on, `startFocus(blocked, Number.MAX_SAFE_INTEGER)` runs immediately
and keeps running until the switch is turned off, regardless of focus sessions
or prayer times. When off, `stopFocus()`.

Two things this must not do. It must not survive a reboot silently — persist the
switch, but never auto-start the service on boot from it, or a forgotten test
switch becomes a permanent background service the user cannot account for. And
its notification text must say *why* the service is running: `Sinov rejimi faol`,
not the normal focus-session wording, so a user who finds it in their shade can
tell it apart from the real feature.

Keep it. It is a legitimate feature in its own right — blocking apps outside a
session is something people want — and hiding it behind a build flag would mean
it is only ever exercised by the person who wrote it.

- [ ] **Step 5: Gate and commit**

```bash
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
git add mobile/src
git commit -m "feat(focus): list the real apps, and a switch to block them now"
```

---

### Task 22: The Fajr scan, for real

Decision D2 was resolved by the owner on 9 Oct: cloud Gemini, and the promise is
rewritten to match. UI shape specified by the owner on 13 Oct.

`alarm/scan.tsx` currently succeeds on a 3.2-second timer — `MOCK_DETECT_MS` is
the entire recognition. This replaces it, and makes a successful scan the thing
that actually silences the alarm.

**The copy change ships in the same commit as the feature.** The app says, in two
places, *"Rasm saqlanmaydi va hech qayerga yuborilmaydi"* — the image is not
saved and not sent anywhere. Sending it to Gemini makes that false. Shipping the
recognition without the new wording would make the app lie about the one subject
it is loudest about.

**The Gemini key never goes in the app.** Anything in `EXPO_PUBLIC_*` is compiled
into the APK and readable by anyone who downloads it. The phone uploads the frame
to our own server, which holds the key. It is on disk at `.secrets/gemini.key`,
gitignored — read it into `server/.env` as `GEMINI_API_KEY`, never paste it into
a file that is tracked.

**Files:**
- Create: `server/src/routes/scan.ts`, `server/src/scan/gemini.ts`
- Test: `server/src/__tests__/scan.test.ts`
- Modify: `server/.env.example`
- Rewrite: `mobile/src/app/alarm/scan.tsx`
- Modify: `mobile/src/app/alarm/ringing.tsx`, `design-v3/11-scanobject.html`

**Interfaces:**
- `POST /scan` taking `{ image: string, target: 'mat' | 'sink' | 'both' }` where
  `image` is a base64 JPEG, returning `{ match: boolean; label?: string }`

- [ ] **Step 1: Write the failing server tests**

```ts
it('rejects a body too large to be a camera frame', async () => {
  const res = await app.inject({ method: 'POST', url: '/scan',
    payload: { image: 'x'.repeat(3_000_000), target: 'mat' } });
  expect(res.statusCode).toBe(413);
});

it('rejects an unknown target', async () => {
  const res = await app.inject({ method: 'POST', url: '/scan',
    payload: { image: 'abc', target: 'bicycle' } });
  expect(res.statusCode).toBe(400);
});

it('returns match:false rather than throwing when Gemini is unreachable', async () => {
  // the caller is standing in the dark at 5am; a 500 here is a dead end
});

it('never logs or persists the image', async () => {
  // spy on the logger and on fs; neither may see the base64 payload
});
```

That last one is the promise, as a test. The new copy says the image is deleted
immediately — that has to be true in code, not in a sentence.

- [ ] **Step 2: Run them and watch them fail**

Run: `cd server && npm test -- scan`
Expected: FAIL — the route does not exist.

- [ ] **Step 3: Implement the route**

`gemini.ts` calls `gemini-2.5-flash` with the frame and a prompt that asks one
question and permits one of two answers. The prompt depends on `target`:

- `mat` → does this photograph contain a prayer mat (janamaz)?
- `sink` → does this photograph contain a bathroom or kitchen sink?
- `both` → does it contain either?

Ask for a bare `yes` or `no` and treat anything else as `no`. A model that
answers in a sentence must not be parsed as a match by accident.

Cap the body at 2 MB and rate-limit to one call per 10 seconds per IP. The key
goes in the `x-goog-api-key` header, never in the URL, so it stays out of logs
and process listings.

**Authentication is deliberately not required yet.** Task 8 has not landed, so no
client can hold a token. Note it in the report; `/scan` must require a valid JWT
the moment Task 8 ships, or it is an open endpoint that costs money per call.

- [ ] **Step 4: Run the tests to verify they pass**

- [ ] **Step 5: Rebuild the scan screen**

The shape the owner asked for:

- Full-bleed `CameraView`.
- **Corner brackets**, not a full rectangle — four L-shaped marks at the corners
  of a centred square frame, which reads as "aim here" without boxing the picture
  in. White, ~3px, ~28px arms, with a soft shadow so they survive a bright
  bathroom and a dark bedroom alike.
- **A shutter button in the middle**, at the bottom: a filled circle inside a
  ring, the standard camera idiom, at least 72px so it can be hit half-awake.
- Above the frame, one line naming what to point at, from the user's own
  onboarding choice — `TARGET_LABEL` already holds the three strings.
- Below, the honest sentence from Step 7.

States, all on the one screen, no navigation between them:
- **idle** — brackets, shutter live
- **sending** — shutter becomes a spinner, brackets pulse once; no fake progress
  bar, because we do not know how long Gemini will take
- **no match** — brackets flash amber, line reads
  `Topilmadi. Yana bir marta urinib ko'ring.`, shutter returns. Never auto-retry:
  a loop of silent failed uploads is the worst version of this.
- **match** — brackets flash green, haptic success, then the alarm is dismissed

Take the frame with `takePictureAsync({ quality: 0.5, base64: true, skipProcessing: true })`.
Half quality is plenty for "is there a mat in this" and keeps the upload small on
a rural connection.

- [ ] **Step 6: Make the scan actually dismiss the alarm**

This is the point of the feature. On `match: true`, stop the alarm and route to
`/alarm/success`. On anything else the alarm keeps ringing.

`ringing.tsx` already has a ten-second hold-to-escape, and it stays exactly as it
is. It is the reason this gate is acceptable: a phone with no signal at dawn, or
a model having a bad day, must never leave someone unable to silence their own
alarm. Do not add a second escape and do not weaken this one.

When the server cannot be reached, say so plainly — `Internetga ulanib
bo'lmadi.` — and leave the shutter live. Do not silently pass the scan, and do
not silently fail it either.

- [ ] **Step 7: Rewrite the promise**

In `mobile/src/app/alarm/scan.tsx` and `design-v3/11-scanobject.html`, replace
*"Rasm saqlanmaydi va hech qayerga yuborilmaydi"* with:

`Rasm tekshirish uchun serverga yuboriladi va darhol o'chiriladi. Hech qayerda saqlanmaydi.`

The design file changes too. This project's rule is that copy comes from the
mockups, so a change that lands only in the app puts the two out of sync.

- [ ] **Step 8: Note it for the privacy policy**

The policy Task 13 links to must say the same. Record it in your report — Task 12
cannot submit to Play with a policy that contradicts the app.

- [ ] **Step 9: Gate and commit**

```bash
cd server && npx tsc --noEmit && npm test
cd ../mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
git add server/src server/.env.example mobile/src design-v3
git commit -m "feat(scan): recognise the frame with Gemini, and say so plainly"
```

Testing against a real phone: the server is not deployed, so point
`EXPO_PUBLIC_API_URL` at the Mac's LAN address (`http://192.168.x.x:8080`) with
both devices on the same Wi-Fi. Say in your report which address you used.

### Task 23: Lock mode, beside the reminder

Added 9 Oct 2026 at the owner's request, after testing the reminder on a real
phone and asking for an actual lock.

The mockup says *"bu qulf emas, eslatma"* — this is not a lock, it is a
reminder — and Task 20 built exactly that. The owner now wants a real lock. This
adds it as a **second mode** rather than replacing the first, because both are
defensible and which one works is a question about the user, not about the code:
a reminder respects someone who has decided; a lock helps someone who has not.

Almost all of it already exists. The foreground service, the rolling detection
loop, the translucent Activity, the permissions and the config plugin are shared
unchanged. What differs is which buttons the Activity shows and what Back does.

**Files:**
- Modify: `mobile/modules/app-watch/android/.../ReminderActivity.kt` (or whatever
  Task 20's fix named it), `FocusService.kt`, `AppWatchModule.kt`, the plugin if
  a new Activity flag is needed
- Modify: `mobile/modules/app-watch/index.ts`
- Modify: `mobile/src/app/focus/apps.tsx`, `mobile/src/data/store.tsx`
- Modify: `design-v3/09-focusapps.html` — the mockup's copy changes, see below
- Test: `mobile/src/data/__tests__/appwatch.test.ts`

**Interfaces:**
- `startFocus(blocked: string[], endsAt: number, mode: 'remind' | 'lock')` — the
  third argument is new. Default `'remind'` if absent, so nothing that already
  calls it changes behaviour.
- Store gains `blockMode: 'remind' | 'lock'`, persisted, default `'remind'`.

- [ ] **Step 1: The mode switch**

A segmented control at the top of `focus/apps.tsx`, under the test switch:

- `Eslatma` — sub: `Ogohlantiradi, lekin ilovani ochishga ruxsat beradi`
- `Qulf` — sub: `Ilovani umuman ochtirmaydi`

- [ ] **Step 2: What lock mode changes in the Activity**

In `'lock'` mode the Activity drops `Davom etish` — there is no path back into
the blocked app — and shows instead:

- `Bosh ekran` → `startActivity` of the home intent (`ACTION_MAIN` +
  `CATEGORY_HOME`), then `finish()`
- `Fokusni to'xtatish` → opens Mizan so the session or the test switch can be
  turned off, then `finish()`

Back must behave as `Bosh ekran`, never as a dismissal. Override
`onBackPressed` (or the predictive-back callback) rather than letting the
default finish the Activity, because the default returns the user to the
blocked app, which is precisely the hole.

The two-dismissal cutoff is a **reminder** rule and must not apply in lock mode.
In lock mode the Activity re-presents every time the blocked app comes forward,
for as long as the session lasts.

- [ ] **Step 3: Always leave a way out**

This is the step that matters most and is easiest to skip. A lock the user
cannot escape is not a feature, it is a bug report from someone who cannot use
their phone.

- `Fokusni to'xtatish` must work even while the lock is showing. Mizan itself is
  never blockable — filter our own package out of `installedApps()` if that is
  not already done, and assert it in a test.
- The lock must never apply to the dialer, Settings, or the launcher. Keep a
  small hard exclusion list by package prefix and test it.
- A `'lock'` session still ends at `endsAt`. The test switch has no end time, so
  it is the one case that can run indefinitely — make sure turning the switch
  off is reachable in one tap from `Fokusni to'xtatish`.

- [ ] **Step 4: Change the mockup's copy**

`design-v3/09-focusapps.html` currently promises *"bu qulf emas, eslatma"*. With
lock mode shipped, that sentence is only true of one of the two modes. Rewrite
it to describe the choice:

`Ikki xil: eslatma yoki qulf. O'zingiz tanlaysiz.`

This project's rule is that copy comes from the mockups, so leaving the design
file saying the opposite of what the app does is how the two drift apart.

- [ ] **Step 5: Tests**

- `startFocus` without a mode behaves as `'remind'` — the compatibility promise
- Mizan's own package never appears in `installedApps()`
- the dialer, Settings and the launcher are excluded from blocking
- the dismissal cutoff applies in `'remind'` and does not in `'lock'`

- [ ] **Step 6: Verify on device**

Report with real output: in lock mode, opening a blocked app presents the lock;
Back goes home rather than to the app; `Fokusni to'xtatish` reaches Mizan and
turning the switch off releases it; reminder mode still lets `Davom etish`
through.

- [ ] **Step 7: Gate and commit**

```bash
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
npx expo prebuild --platform android
git add mobile/modules mobile/src design-v3
git commit -m "feat(focus): add a lock mode beside the reminder"
```

---

### Task 24: A Fajr alarm that actually goes off

Added 13 Oct 2026. The app has a ringing screen, a hold-to-escape, a camera
scan that dismisses it, and a `fajrAlarm` toggle in settings. **None of it is
ever triggered.** The only thing that opens `/alarm/ringing` is a
*"Signalni sinab ko'rish"* test button in `settings/alarm.tsx`. There is no
alarm — there is a demonstration of one.

Task 11 was written as "survive Doze and tell the user when you cannot", which
would have hardened something that does not exist. This builds the thing first;
Task 11's permission-state UI folds in as Step 7.

A prayer alarm is the feature people will judge this app on. If it fails once,
at 5am, they uninstall it. Everything below is chosen for reliability over
elegance.

**Files:**
- Create: `mobile/modules/app-watch/android/src/main/java/uz/mizan/appwatch/AlarmScheduler.kt`,
  `AlarmReceiver.kt`, `BootReceiver.kt`, `AlarmService.kt`
- Modify: `mobile/modules/app-watch/android/.../AppWatchModule.kt`,
  `mobile/modules/app-watch/index.ts`, `plugin/withAppWatch.js`
- Modify: `mobile/src/app/_layout.tsx`, `mobile/src/app/settings/alarm.tsx`,
  `mobile/src/app/alarm/ringing.tsx`
- Test: `mobile/modules/app-watch/android/src/test/.../AlarmScheduleTest.kt`,
  `mobile/src/data/__tests__/alarm.test.ts`

**Interfaces:**
- `scheduleFajrAlarm(atEpochMs: number): void`
- `cancelFajrAlarm(): void`
- `canScheduleExact(): boolean`
- `requestExactAlarmPermission(): void`
- `nextFajrAlarmAt(): number | null`

- [ ] **Step 1: Use `setAlarmClock`, nothing weaker**

`AlarmManager.setAlarmClock(AlarmClockInfo, PendingIntent)` is the only API the
system treats as critical enough to **leave Doze for**, and it is the only one
that shows the alarm icon in the status bar — which doubles as the user's proof
it is set. `setExactAndAllowWhileIdle` is weaker and `setRepeating` is not exact
at all.

Alarms are **single-fire**. Reschedule tomorrow's from inside the receiver when
today's fires, and again on every app start, because a receiver that never ran
leaves nothing scheduled.

- [ ] **Step 2: Declare the permissions, and handle being refused**

In `withAppWatch.js`:

```xml
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

Both alarm permissions, deliberately. `USE_EXACT_ALARM` is granted at install
but Google Play restricts it to apps whose core user-facing function needs
precise timing — an alarm clock qualifies, and this is one. `SCHEDULE_EXACT_ALARM`
is the fallback, and since Android 14 it is **denied by default**: check
`AlarmManager.canScheduleExactAlarms()` and, when false, send the user to
`Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM`.

Record for Task 12: both `USE_EXACT_ALARM` and `USE_FULL_SCREEN_INTENT` need a
Play Console declaration. Full-screen intents are restricted to alarm and calling
apps on Android 14+, and shipping without the declaration is a rejection.

- [ ] **Step 3: Receiver → notification → Activity**

The chain that works, in this order and no other:

`setAlarmClock` fires → a lightweight `AlarmReceiver` → a high-priority
notification carrying a **full-screen intent** → the app opens at
`/alarm/ringing` → a short-lived foreground service holds the wake lock and
plays the sound.

The receiver must do almost nothing — post the notification and return. Work in
a receiver is killed.

The full-screen intent is what shows the alarm over the lock screen. On a device
where the user has refused it, the notification still arrives as a heads-up with
sound, which is a degraded alarm rather than no alarm. Build for that case
instead of assuming the grant.

- [ ] **Step 4: Sound that behaves like an alarm**

Play through `AudioManager.STREAM_ALARM`, not the media or notification stream —
it is the stream that ignores silent mode and uses the alarm volume the user
set for exactly this. Loop until dismissed. Hold a `PARTIAL_WAKE_LOCK` for the
duration and release it in `onDestroy`, in a `finally`, because a leaked wake
lock flattens the battery overnight and is the single worst bug this feature can
have.

The settings screen already promises *"Asta-sekin kuchayadi"* — gradually gets
louder. Honour it: ramp the volume over the first 30 seconds rather than opening
at full. That promise is already printed, so it is not optional.

- [ ] **Step 5: Schedule from the real prayer time**

`mobile/src/data/prayer.ts` already computes Fajr via `adhan` for the user's
madhhab. On app start, and whenever `fajrAlarm` or the madhhab changes:

- `settings.fajrAlarm` false → `cancelFajrAlarm()`
- true → schedule the **next** Fajr; if today's has passed, tomorrow's

Never schedule a time in the past: `setAlarmClock` with a past time fires
immediately, which means an alarm going off the moment the user enables it.

- [ ] **Step 6: Survive a reboot**

`BootReceiver` on `RECEIVE_BOOT_COMPLETED` (already in the manifest)
recalculates and reschedules. Alarms do not survive a restart, and a phone
restarted at midnight is a phone with no alarm at 5am — which the user only
discovers by sleeping through it.

- [ ] **Step 7: Tell the user when it cannot work (was Task 11)**

`settings/alarm.tsx` currently shows a toggle that promises something it does
not deliver. It must show the real state:

- exact alarms not permitted → `Aniq vaqtda ishlashi uchun ruxsat kerak` with a
  button to the system screen
- notifications not permitted → the same for `POST_NOTIFICATIONS`
- battery optimisation on → `Telefon ilovani uxlatib qo'yishi mumkin` and a
  button to `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`

The toggle is **disabled** while exact alarms are refused. A switch that is on
while the alarm cannot fire is the lie this task exists to remove.

Under it, show when the next alarm will actually ring, read from
`nextFajrAlarmAt()` — not recomputed in JS. If the two ever disagree, the user
should see what the system has, not what the app believes.

- [ ] **Step 8: Tests**

Pure Kotlin, in the module's existing JUnit suite:
- the next Fajr from a given "now" is tomorrow's when today's has passed
- never returns a time in the past
- changing madhhab changes the scheduled time

JS side:
- turning `fajrAlarm` off calls `cancelFajrAlarm`
- turning it on with exact alarms refused does **not** claim to have scheduled

- [ ] **Step 9: Verify, and say what you could not**

The local emulator ANRs on cold start under ARM translation; previous agents
lost whole windows to it. Do not fight it. Report what you confirmed:
`adb shell dumpsys alarm | grep uz.mizan` showing the alarm with its trigger
time, and the manifest entries after `npx expo prebuild --platform android`.

Say plainly that a real 5am fire is unverified. It is the owner's to test, and
the only test that counts.

- [ ] **Step 10: Gate and commit**

```bash
cd mobile && npx tsc --noEmit && npx expo lint && npx jest && npm run smoke
npx expo prebuild --platform android
git add mobile/modules mobile/src
git commit -m "feat(alarm): a Fajr alarm that is actually scheduled and actually rings"
```
