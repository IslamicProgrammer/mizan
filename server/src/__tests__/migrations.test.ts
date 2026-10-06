import { describe, expect, it } from 'vitest';
import { pendingMigrations } from '../migrations.js';

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
