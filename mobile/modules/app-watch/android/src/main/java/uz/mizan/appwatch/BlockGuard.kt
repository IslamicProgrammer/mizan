package uz.mizan.appwatch

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.telecom.TelecomManager
import android.util.Log

/**
 * The one list of packages a focus session can never apply to, independent
 * of what the user chose to block and independent of which mode (Task 23:
 * `'remind'` or `'lock'`) a session runs in.
 *
 * Mizan's own package is excluded by identity, never a hardcoded string --
 * a debug build is signed as `uz.mizan.app.debug`, not `uz.mizan.app`, and
 * hardcoding the release id here would leave exactly that build free to
 * lock itself out.
 *
 * The launcher and the dialer used to be excluded by a fixed prefix list
 * alone ("a short list of known roots is something this object can get
 * right once and never regress" -- that reasoning shipped, and a field
 * report proved it wrong: a user on Lawnchair, a third-party launcher not
 * on the list, got the lock card presented over their own home screen with
 * no way back in. A static list can only ever enumerate launchers and
 * dialers that existed when it was written. [refresh] replaces that with a
 * runtime query -- every home-capable package via `ACTION_MAIN` /
 * `CATEGORY_HOME` (not just the one currently active default, so switching
 * launchers later cannot reopen this exact bug) and `TelecomManager`'s
 * default dialer -- and keeps the prefix lists only as the fallback for
 * when a query comes back empty or null, never as the primary source.
 * Settings has no equivalently reliable intent to query, so it stays on a
 * fixed prefix list; that one was never the bug.
 *
 * [AppWatchModule.installedApps] and [FocusService.tick] (via [refresh],
 * called once per `FocusService` start, never from its 900ms poll) both
 * call through here rather than each keeping their own copy, so the picker
 * a user chooses from and the poll loop that actually enforces the choice
 * can never disagree about what is blockable.
 *
 * [isHardExcluded] and [isBlockable] stay pure and Android-free, like
 * [ForegroundAppTracker] and [PresentationGate] -- unit-tested directly,
 * not through Robolectric or a device. [refresh] is the one Android-
 * dependent method, deliberately separated out the same way
 * [ForegroundApp] separates its own Android-dependent query from
 * [ForegroundAppTracker]'s pure decision logic.
 */
object BlockGuard {
  private const val TAG = "AppWatch"

  private const val SYSTEM_UI_PACKAGE = "com.android.systemui"

  // Fallback only, for whichever of the two live queries in [refresh] came
  // back empty or null -- never consulted ahead of a successful query.
  // Prefixes, not an exact package name each: OEM skins ship their own
  // dialer under a vendor-specific name (Samsung's is
  // `com.samsung.android.dialer`), and a short list of common roots covers
  // more real devices than an exhaustive list of AOSP-only names ever
  // would, for the rare case the runtime query itself is denied or fails.
  private val FALLBACK_LAUNCHER_PREFIXES = listOf(
    "com.android.launcher",
    "com.google.android.apps.nexuslauncher",
    "com.sec.android.app.launcher",
    "com.miui.home",
    "com.oneplus.launcher",
  )
  private val FALLBACK_DIALER_PREFIXES = listOf(
    "com.android.dialer",
    "com.google.android.dialer",
    "com.android.phone",
    "com.samsung.android.dialer",
    "com.samsung.android.app.telephonyui",
  )

  // No `ACTION_MAIN` / `CATEGORY_HOME`-style intent reliably resolves "the
  // Settings app" the way it does for a launcher or `TelecomManager` does
  // for a dialer, so this one stays a fixed prefix list -- it was never
  // the bug the launcher list was.
  private val SETTINGS_PREFIXES = listOf("com.android.settings")

  // Empty / null until the first [refresh] -- which is also exactly the
  // state a plain JUnit test (no Android framework, no Context) runs
  // under, so [isHardExcluded] falls back to the prefix lists there too.
  @Volatile
  private var resolvedHomePackages: Set<String> = emptySet()

  @Volatile
  private var resolvedDialerPackage: String? = null

  /**
   * Re-resolves the launcher(s) and dialer this device actually has right
   * now. Every home-capable package, not only the currently active
   * default -- a user who installs a second launcher, or switches which
   * one is default, must never make the previous one blockable again
   * simply because it stopped being "the" default for a moment.
   *
   * Called once per `FocusService` start (session-scoped state, not
   * per-tick: a `queryIntentActivities` call on every 900ms poll would be
   * wasted work for a set that only ever changes when the user installs or
   * reconfigures a launcher or dialer) and from
   * `AppWatchModule.installedApps()`, so the enforcement loop and the
   * picker the user chooses from are never reading two different answers
   * to "what's a launcher on this phone".
   */
  fun refresh(ctx: Context) {
    val home = try {
      val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
      ctx.packageManager
        .queryIntentActivities(homeIntent, PackageManager.MATCH_DEFAULT_ONLY)
        .map { it.activityInfo.packageName }
        .toSet()
    } catch (e: Exception) {
      emptySet()
    }
    val dialer = try {
      ctx.getSystemService(TelecomManager::class.java)?.defaultDialerPackage
    } catch (e: Exception) {
      null
    }

    resolvedHomePackages = home
    resolvedDialerPackage = dialer

    if (home.isEmpty()) {
      Log.w(TAG, "BlockGuard.refresh: no home-capable package resolved -- falling back to the static launcher prefixes")
    }
    if (dialer == null) {
      Log.w(TAG, "BlockGuard.refresh: no default dialer resolved -- falling back to the static dialer prefixes")
    }
    // The one line that makes "a launcher got blocked" diagnosable from a
    // report alone, the way every early return in FocusService already is.
    Log.i(TAG, "BlockGuard.refresh: launcher(s)=$home dialer=$dialer -- none of these are ever blockable")
  }

  /**
   * True for a package this app must never treat as blockable, regardless
   * of what the `blocked` list `startFocus` was given says. Checked again
   * in [FocusService.tick] rather than trusted from that list -- that list
   * ultimately comes from [AppWatchModule.installedApps], and a guard that
   * only lives at the picker is a guard that stops working the moment
   * anything upstream of it changes.
   */
  fun isHardExcluded(pkg: String): Boolean {
    if (pkg == SYSTEM_UI_PACKAGE) return true

    val home = resolvedHomePackages
    if (home.isNotEmpty()) {
      if (pkg in home) return true
    } else if (FALLBACK_LAUNCHER_PREFIXES.any { pkg.startsWith(it) }) {
      return true
    }

    val dialer = resolvedDialerPackage
    if (dialer != null) {
      if (pkg == dialer) return true
    } else if (FALLBACK_DIALER_PREFIXES.any { pkg.startsWith(it) }) {
      return true
    }

    return SETTINGS_PREFIXES.any { pkg.startsWith(it) }
  }

  /**
   * `ownPackage` is the caller's actual `Context.packageName`, passed in
   * rather than a constant, for the same debug-build reason as the class
   * doc above.
   */
  fun isBlockable(pkg: String, ownPackage: String): Boolean =
    pkg != ownPackage && !isHardExcluded(pkg)

  /**
   * Visible for tests: applies an already-resolved launcher/dialer set
   * without going through [refresh]'s `PackageManager` / `TelecomManager`
   * calls, which throw under a plain JUnit test with no Android framework
   * present. This is what lets "a resolved home package is never
   * blockable" -- the exact shape of the Lawnchair bug -- be asserted
   * directly, without Robolectric or a device.
   */
  fun applyResolvedForTesting(homePackages: Set<String>, dialerPackage: String?) {
    resolvedHomePackages = homePackages
    resolvedDialerPackage = dialerPackage
  }
}
