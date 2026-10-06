// Importing mobile/src/data/env.ts evaluates `export const ENV = readEnv(process.env)`
// at module load time (by design — a missing var must fail at startup, not later).
// Tests import `readEnv` from that same module to exercise it directly with fake
// input, so the module still needs a valid process.env at import time, or the
// import itself throws before any test body runs. This placeholder satisfies that
// without the test file touching process.env itself.
process.env.EXPO_PUBLIC_API_URL ||= 'https://api.mizan.test';
