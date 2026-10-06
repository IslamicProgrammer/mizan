import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `npm run build` leaves compiled tests in dist/; without this, vitest's
    // default glob picks those up too and runs every test twice.
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Dummy ENV values so unit tests don't need a real DATABASE_URL/JWT_SECRET
    // exported in the shell. See vitest.setup.ts for why each one is needed.
    setupFiles: ['./vitest.setup.ts'],
  },
});
