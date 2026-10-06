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

**Recommendation: on-device.** Three reasons, in order. The promise is already printed in the UI and withdrawing it is a real cost to a product whose other differentiator is public honesty. The alarm fires at dawn when a phone may be in airplane mode or on poor rural signal, and a scan that needs the network is a scan that fails exactly when it matters. And a per-call cost on a daily action for every user, in a market where the subscription is ~16 500 so'm/month, is a bad unit economic.

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

### Task 9: Deploy to Contabo

**Files:**
- Create: `server/Dockerfile`, `server/docker-compose.yml`, `server/Caddyfile`, `server/.env.example`, `server/deploy.md`

**Interfaces:**
- Produces: `https://api.mizanapp.uz/health` returning `{"ok":true}` over valid TLS.

**`api.mizanapp.uz` must already resolve to the Contabo IP** — Caddy gets its
certificate over HTTP-01 and will fail without it.

- [ ] **Step 1: Write the Dockerfile**

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Write compose and Caddy**

```yaml
# server/docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: mizan
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10

  api:
    build: .
    restart: always
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/mizan
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    depends_on:
      db: { condition: service_healthy }

  caddy:
    image: caddy:2-alpine
    restart: always
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddydata:/data
    depends_on: [api]

volumes: { pgdata: {}, caddydata: {} }
```

```
# server/Caddyfile
api.mizanapp.uz {
  reverse_proxy api:8080
}
```

Note that `api` and `db` publish **no ports** — only Caddy is reachable from the
internet. Exposing Postgres on a public VPS is how a database gets wiped.

- [ ] **Step 3: Put the real secrets on the server only**

```bash
# on the Contabo box, never in git
cat > /opt/mizan/.env <<'EOF'
POSTGRES_PASSWORD=<generate: openssl rand -base64 32>
JWT_SECRET=<generate: openssl rand -base64 48>
GOOGLE_CLIENT_ID=<from Google Cloud console, Android + Web client>
EOF
chmod 600 /opt/mizan/.env
```

- [ ] **Step 4: Bring it up and verify TLS**

```bash
ssh contabo 'cd /opt/mizan && docker compose up -d --build'
curl -s https://api.mizanapp.uz/health
```
Expected: `{"ok":true}` with a valid certificate — check `curl -v` shows no TLS warning.

- [ ] **Step 5: Verify it survives a reboot**

```bash
ssh contabo 'sudo reboot' && sleep 60 && curl -s https://api.mizanapp.uz/health
```
Expected: `{"ok":true}`. `restart: always` is the only thing making this true.

- [ ] **Step 6: Verify a database backup exists before any real user does**

```bash
ssh contabo 'docker compose exec -T db pg_dump -U postgres mizan | gzip > /opt/mizan/backups/$(date +%F).sql.gz'
```
Add it to cron, daily. A garden that took someone two months to grow has no
other copy once sync is live.

- [ ] **Step 7: Commit**

```bash
git add server && git commit -m "ops: dockerised deploy with caddy TLS on contabo"
```

## Phase 2 — Notifications that actually fire

This is the last blocker on the clock. Google checks testers *used* the app; a
prayer app nobody is reminded to open is a prayer app nobody uses. It is also
Review Focus #2 — the failure that makes the product pointless.

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
