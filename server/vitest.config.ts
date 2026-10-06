import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `npm run build` leaves compiled tests in dist/; without this, vitest's
    // default glob picks those up too and runs every test twice.
    exclude: ['**/node_modules/**', '**/dist/**'],
    // db.ts builds a Pool at import time, so even the pure pendingMigrations
    // tests need ENV to resolve. pg.Pool doesn't connect until a query runs,
    // so these fake values never touch a real database.
    env: {
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      JWT_SECRET: 'test',
      GOOGLE_CLIENT_ID: 'test',
    },
  },
});
