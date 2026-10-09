/**
 * Deliberately no icon field (task 21 fix): a phone with 150-300 launchable
 * apps would push 5-15 MB of inline base64 across the bridge in one
 * synchronous call if every row's icon rode along here. Call `appIcon(pkg)`
 * per row instead -- it is cached natively, so re-asking for the same
 * package after a re-render or a scroll is nearly free.
 */
export type InstalledApp = { pkg: string; label: string };

export type AppUsage = { pkg: string; minutes: number };
