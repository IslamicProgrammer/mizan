package uz.mizan.appwatch

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log

/**
 * The reminder -- and, as of task 23, the lock -- launched from
 * [FocusService]'s poll loop when a blocked package is in front. A
 * translucent Activity, not a `WindowManager` / `TYPE_APPLICATION_OVERLAY`
 * view (task 20 fix round 1): a background activity launch from a
 * foreground service is permitted precisely because this app holds
 * `SYSTEM_ALERT_WINDOW`, and unlike an overlay view it does not depend on
 * surviving whatever the blocked app does to its own window stack.
 *
 * block-screen.md: this class draws nothing any more. The XML dialog it
 * used to show (`activity_reminder.xml`) looked like a system alert, not
 * like Mizan -- because a native Activity cannot reach this app's fonts,
 * tokens, or the arch motif every other screen uses. The actual screen is
 * `focus/blocked.tsx`, built from the same design system as everything
 * else, and this class's only job now is to get there: deep-link into
 * `mizan://focus/blocked?pkg=<package>` and finish, so the RN side -- which
 * already has `prayer.ts` and `packageManager` -- resolves the label, the
 * prayer, and the minutes remaining itself. Nothing but the package name
 * crosses this boundary; recomputing prayer times natively would be a
 * second source of truth for something `prayer.ts` already owns, and it
 * would drift.
 *
 * Still kept as a real Activity, not retired outright: it is what gets this
 * app onto the screen over another app at all (a background activity
 * launch, permitted only because this app holds `SYSTEM_ALERT_WINDOW`), and
 * `singleInstance` (see `withAppWatch.js`) keeps it in its own task, never
 * reordering or finishing the blocked app's task underneath it.
 *
 * Mode (`'remind'` vs `'lock'`) is deliberately not one of the two things
 * this class passes along -- not an extra here, not a query parameter on
 * the deep link. `focus/blocked.tsx` reads it back itself, through
 * `AppWatchModule.focusMode()` (`FocusService.currentMode`), the same way
 * it reads everything else that is session state rather than
 * recomputable data. What used to be this class's own back-press override
 * for lock mode is now that screen's own `BackHandler` -- see its doc for
 * why Back must still never reveal the blocked app in lock mode.
 */
class ReminderActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val pkg = intent.getStringExtra(EXTRA_PACKAGE)
    if (pkg == null) {
      // Should never happen -- `FocusService` always sets it -- but a
      // reminder with no package to show is worse than none at all, and a
      // silent crash here would be worse still.
      Log.w(TAG, "launched with no package extra -- finishing without presenting")
      finish()
      return
    }

    val deepLink = Uri.parse(FOCUS_BLOCKED_DEEP_LINK).buildUpon()
      .appendQueryParameter("pkg", pkg)
      .build()
    try {
      startActivity(
        Intent(Intent.ACTION_VIEW, deepLink).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        },
      )
    } catch (e: Exception) {
      // An OEM skin refusing this background-launched deep link is a worse
      // failure than a missed reminder, but it must not crash the poll loop
      // that launched this Activity.
      Log.w(TAG, "deep link to focus/blocked failed: ${e.message}")
    }
    finish()
  }

  companion object {
    private const val TAG = "AppWatch"
    const val EXTRA_PACKAGE = "pkg"
    private const val FOCUS_BLOCKED_DEEP_LINK = "mizan://focus/blocked"
  }
}
