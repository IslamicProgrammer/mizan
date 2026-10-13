// Several modules read `ENV` at import time (token.ts signs with the secret,
// google.ts constructs its client with the client id, db.ts opens a pool with
// the connection string). The unit-test run never talks to a real database or
// Google, so these are dummy values — they only need to satisfy env.ts's
// checks, including the 32-character floor on JWT_SECRET. The one test that
// needs a real database opts in separately via TEST_DATABASE_URL.
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-only-not-a-real-secret-0123456789ab';
process.env.GOOGLE_CLIENT_ID ??= 'test-client-id';
process.env.GEMINI_API_KEY ??= 'test-only-not-a-real-key';
