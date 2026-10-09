package uz.mizan.appwatch

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.TextView

/**
 * The reminder -- and, as of task 23, the lock -- launched from
 * [FocusService]'s poll loop when a blocked package is in front. A
 * translucent Activity, not a `WindowManager` / `TYPE_APPLICATION_OVERLAY`
 * view (task 20 fix round 1): a background activity launch from a
 * foreground service is permitted precisely because this app holds
 * `SYSTEM_ALERT_WINDOW`, and unlike an overlay view it does not depend on
 * surviving whatever the blocked app does to its own window stack.
 *
 * `'remind'` (the default -- see `index.ts`): "bu qulf emas, eslatma" --
 * both buttons only finish this Activity. Neither closes, kills, or
 * otherwise touches the app underneath.
 * - `Davom etish` leaves the blocked app's task exactly where
 *   `singleInstance` (see `withAppWatch.js`) put it, paused and never
 *   finished, below this one -- finishing this Activity reveals it again,
 *   unchanged.
 * - `Yopish` goes to the home screen first, then finishes this Activity, so
 *   the blocked app is not what the user sees next.
 *
 * `'lock'`: there is no `Davom etish`, on screen or otherwise -- no button,
 * and no system gesture, leads back into the blocked app. Instead:
 * - `Bosh ekran` does exactly what `Yopish` does above.
 * - `Fokusni to'xtatish` opens Mizan itself (see `openMizan`), landing on
 *   the one screen that can turn the session or the test switch off --
 *   never finishing without first changing screens, or this button would
 *   be a dead end identical to the one lock mode exists to remove.
 *
 * Both modes call [FocusService.notifyDismissed] from every button --
 * [PresentationGate] is what actually tells the two modes' dismissals
 * apart (its two-dismissal cutoff is a `'remind'`-only rule), not this
 * class.
 *
 * Back is overridden for the same reason lock mode exists at all: its
 * default behaviour -- finish this Activity, reveal whatever `singleInstance`
 * left underneath -- is precisely the path back into the blocked app a lock
 * promises does not exist. `onBackPressed()` (not a predictive-back
 * callback) is the right override here because `app.json` sets
 * `predictiveBackGestureEnabled: false`, which `withAppWatch.js`'s generated
 * manifest carries as `android:enableOnBackInvokedCallback="false"` on the
 * whole application -- the system calls this legacy method on every Android
 * version this app ships on, never a registered `OnBackInvokedCallback`.
 */
class ReminderActivity : Activity() {
  private var mode: String = FocusService.MODE_REMIND
  private var pkg: String? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_reminder)

    val pkg = intent.getStringExtra(EXTRA_PACKAGE)
    this.pkg = pkg
    if (pkg == null) {
      // Should never happen -- `FocusService` always sets it -- but a
      // reminder with nothing to dismiss and nothing to return to would be
      // worse than none at all, and a silent crash here would be worse
      // still.
      Log.w(TAG, "launched with no package extra -- finishing without presenting")
      finish()
      return
    }
    val label = intent.getStringExtra(EXTRA_LABEL) ?: pkg
    mode = intent.getStringExtra(EXTRA_MODE) ?: FocusService.MODE_REMIND

    findViewById<TextView>(R.id.reminder_body).text = "$label ochildi. Hozir fokusdasiz."

    val remindContinue = findViewById<TextView>(R.id.reminder_continue)
    val remindClose = findViewById<TextView>(R.id.reminder_close)
    val lockHome = findViewById<TextView>(R.id.lock_home)
    val lockStop = findViewById<TextView>(R.id.lock_stop)

    if (mode == FocusService.MODE_LOCK) {
      remindContinue.visibility = View.GONE
      remindClose.visibility = View.GONE
      lockHome.visibility = View.VISIBLE
      lockStop.visibility = View.VISIBLE

      lockHome.setOnClickListener {
        FocusService.notifyDismissed(pkg)
        goHome()
      }
      lockStop.setOnClickListener {
        FocusService.notifyDismissed(pkg)
        openMizan()
      }
    } else {
      remindContinue.setOnClickListener {
        FocusService.notifyDismissed(pkg)
        finish()
      }
      remindClose.setOnClickListener {
        FocusService.notifyDismissed(pkg)
        goHome()
      }
    }
  }

  @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
  override fun onBackPressed() {
    if (mode == FocusService.MODE_LOCK) {
      pkg?.let { FocusService.notifyDismissed(it) }
      goHome()
      return
    }
    super.onBackPressed()
  }

  private fun goHome() {
    startActivity(
      Intent(Intent.ACTION_MAIN).apply {
        addCategory(Intent.CATEGORY_HOME)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      },
    )
    finish()
  }

  /**
   * Mizan is never itself a blocked package (see [BlockGuard]), so this can
   * never land back on this same lock screen -- it is the one app this
   * session can never close the door on. The deep link, not a bare launch
   * of the app's main activity, is what makes turning the session or the
   * test switch off "reachable in one tap" from this button rather than a
   * few taps of navigation after it: it lands directly on `focus/apps.tsx`,
   * where both live.
   *
   * Falls back to a plain launch of the app if the deep link somehow fails
   * to resolve on some OEM skin -- however Mizan is reached, it must be
   * reached. This button is step 3's "always leave a way out" in the one
   * place it has to actually work from.
   */
  private fun openMizan() {
    try {
      startActivity(
        Intent(Intent.ACTION_VIEW, Uri.parse(MIZAN_FOCUS_DEEP_LINK)).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        },
      )
    } catch (e: Exception) {
      Log.w(TAG, "deep link to Mizan failed, falling back to a plain launch: ${e.message}")
      val launch = packageManager.getLaunchIntentForPackage(packageName)
      if (launch != null) {
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(launch)
      }
    }
    finish()
  }

  companion object {
    private const val TAG = "AppWatch"
    const val EXTRA_PACKAGE = "pkg"
    const val EXTRA_LABEL = "label"
    const val EXTRA_MODE = "mode"
    private const val MIZAN_FOCUS_DEEP_LINK = "mizan://focus/apps"
  }
}
