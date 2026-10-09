/**
 * `icon` is a `data:image/png;base64,...` URI decoded from
 * `packageManager.getApplicationIcon(pkg)` at the moment `installedApps()`
 * is called -- never a bundled asset. `null` means the OS icon could not be
 * read (a rare `PackageManager` failure, not "no icon exists"); callers must
 * fall back to a neutral letter tile rather than drawing a stand-in for a
 * brand they have no license to redraw.
 */
export type InstalledApp = { pkg: string; label: string; icon: string | null };

export type AppUsage = { pkg: string; minutes: number };
