import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `npm run build` leaves compiled tests in dist/; without this, vitest's
    // default glob picks those up too and runs every test twice.
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
