# SDD ledger — plan: docs/superpowers/plans/2026-10-06-mizan-android-release.md

## Preflight scan

| Pair / task | Produces → consumes | Finding |
|---|---|---|
| T1 → all | git repo at root | Clean. No repo exists yet; T1 creates it. |
| T2 → T8 | `ENV` (`readEnv`) → `ENV.apiUrl` | **Conflict:** T2 defines only supabase keys; T8 adds `apiUrl`. D4 changed to self-hosted Node, so T2's keys are wrong. |
| T3 → T12 | eas.json profiles → `eas submit` | Clean. |
| T4 → T8 | `EXPO_PUBLIC_API_URL` → `ENV.apiUrl` | Clean. |
| T5 → T6,T7 | `pool`, `ENV`, `migrate` | Clean; signatures match. |
| T6 → T7 | `verifyToken(jwt)` → auth guard | Clean; `{userId}` matches both sides. |
| T7 → T8 | `GET/PUT /profile` → `pullState`/`pushState` | Clean; `{state}` shape matches. |
| T7 internal | `mergeHistory` test vs impl | Clean; 4 cases match the implementation. |
| T10 → T11 | `buildSchedule` → `canScheduleExact` | Clean; independent surfaces. |
| T5 self | tests vs code | Clean; `pendingMigrations` is pure and testable without a DB. |
| T6 self | tests vs code | Clean; token tests need no network. |
| T2 self | tests vs code | **Conflict (same as T2→T8).** |

## Rulings

Ruling: T2 drops the Supabase variables and defines `apiUrl` from the start — D4 chose self-hosted Node, so `EXPO_PUBLIC_SUPABASE_*` would be env that nothing reads. Cost if wrong: a one-line env change in T8.

Ruling: Task 1 runs in the main workspace, not a worktree — a worktree cannot precede the repository it branches from. Immediately after `git init` the work moves to branch `feat/android-release`, leaving `main` untouched. Cost if wrong: a branch rename.

Ruling: Docker is not installed on this machine, so T5 Step 8 (local Postgres verification) and all of T9 cannot run. The server code and its unit tests — which are pure and need no database — proceed; the integration check is deferred and flagged. Cost if wrong: a schema or connection bug survives to first deploy.

Ruling: T3/T4 (EAS), T9 (Contabo deploy) and T12 (Play release) touch systems outside this repo and need credentials or purchases only the user holds. Code tasks run; these stop for the user. Cost if wrong: nothing — stopping is the conservative side.

## Blocked on the user

- `mizanapp.uz` is NXDOMAIN — not registered. Blocks T9 (Caddy TLS) and D5 (package name).
- No SSH host for Contabo. Blocks T9.
- Docker not installed. Blocks T5 Step 8 and T9.
- No Google OAuth Client ID. Blocks end-to-end verification of T6 and T8.
- EAS is logged in as azamov.dev@gmail.com — T3 can run.

## Tasks

