package uz.mizan.appwatch

/**
 * The one list of packages a focus session can never apply to, independent
 * of what the user chose to block and independent of which mode (Task 23:
 * `'remind'` or `'lock'`) a session runs in.
 *
 * Mizan's own package is excluded by identity, never a hardcoded string --
 * a debug build is signed as `uz.mizan.app.debug`, not `uz.mizan.app`, and
 * hardcoding the release id here would leave exactly that build free to
 * lock itself out. The dialer, Settings and the launcher are excluded by a
 * fixed prefix list instead of a runtime query (`TelecomManager`'s default
 * dialer, say): a lock session has to keep working even if that query were
 * ever slow, denied, or wrong on some OEM skin, and a short list of known
 * roots is something this object can get right once and never regress.
 *
 * Lock mode is the one mode a user cannot walk back out of by simply
 * closing the app underneath -- which is exactly why this guard exists.
 * [AppWatchModule.installedApps] and [FocusService.tick] both call through
 * here rather than each keeping their own copy, so the picker a user
 * chooses from and the poll loop that actually enforces the choice can
 * never disagree about what is blockable.
 *
 * Pure and Android-free on purpose, like [ForegroundAppTracker] and
 * [PresentationGate] -- unit-tested directly, not through Robolectric or a
 * device.
 */
object BlockGuard {
  // Prefixes, not an exact package name each: OEM skins ship their own
  // dialer, Settings and launcher under a vendor-specific name (Samsung's
  // dialer is `com.samsung.android.dialer`, Xiaomi's launcher is
  // `com.miui.home`), and a short list of common roots covers more real
  // devices than an exhaustive list of AOSP-only package names ever would.
  private val HARD_EXCLUDED_PREFIXES = listOf(
    // Dialer / phone
    "com.android.dialer",
    "com.google.android.dialer",
    "com.android.phone",
    "com.samsung.android.dialer",
    "com.samsung.android.app.telephonyui",
    // Settings
    "com.android.settings",
    // Launcher / home screen
    "com.android.launcher",
    "com.google.android.apps.nexuslauncher",
    "com.sec.android.app.launcher",
    "com.miui.home",
    "com.oneplus.launcher",
  )

  /**
   * True for a package this app must never treat as blockable, regardless
   * of what the `blocked` list `startFocus` was given says. Checked again
   * in [FocusService.tick] rather than trusted from that list -- that list
   * ultimately comes from [AppWatchModule.installedApps], and a guard that
   * only lives at the picker is a guard that stops working the moment
   * anything upstream of it changes.
   */
  fun isHardExcluded(pkg: String): Boolean = HARD_EXCLUDED_PREFIXES.any { pkg.startsWith(it) }

  /**
   * `ownPackage` is the caller's actual `Context.packageName`, passed in
   * rather than a constant, for the same debug-build reason as the class
   * doc above.
   */
  fun isBlockable(pkg: String, ownPackage: String): Boolean =
    pkg != ownPackage && !isHardExcluded(pkg)
}
