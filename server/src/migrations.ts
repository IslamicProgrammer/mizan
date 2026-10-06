/**
 * Deliberately importless. Its only caller that matters is `migrate()`, but it
 * is also the only part of migration handling that can be tested without a
 * database — which is untrue the moment this file imports a module that builds
 * a connection pool at import time.
 */
export function pendingMigrations(all: string[], applied: string[]): string[] {
  const done = new Set(applied);
  return all.filter((f) => !done.has(f)).sort();
}
