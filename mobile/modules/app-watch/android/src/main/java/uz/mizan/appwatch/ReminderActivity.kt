package uz.mizan.appwatch

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.TextView

/**
 * The reminder itself, launched from [FocusService]'s poll loop when a
 * blocked package is in front. A translucent Activity, not a
 * `WindowManager` / `TYPE_APPLICATION_OVERLAY` view (task 20 fix round 1):
 * a background activity launch from a foreground service is permitted
 * precisely because this app holds `SYSTEM_ALERT_WINDOW`, and unlike an
 * overlay view it does not depend on surviving whatever the blocked app
 * does to its own window stack.
 *
 * "bu qulf emas, eslatma" -- both buttons only finish this Activity. Neither
 * closes, kills, or otherwise touches the app underneath.
 * - `Davom etish` leaves the blocked app's task exactly where
 *   `singleInstance` (see `withAppWatch.js`) put it, paused and never
 *   finished, below this one -- finishing this Activity reveals it again,
 *   unchanged.
 * - `Yopish` goes to the home screen first, then finishes this Activity, so
 *   the blocked app is not what the user sees next.
 *
 * Both count as a dismissal: [FocusService.notifyDismissed] runs either way,
 * which is what [PresentationGate] uses for the 3-second cooldown (so
 * `Davom etish` resuming the blocked app does not immediately re-trigger)
 * and the two-dismissal cutoff.
 */
class ReminderActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_reminder)

    val pkg = intent.getStringExtra(EXTRA_PACKAGE)
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

    findViewById<TextView>(R.id.reminder_body).text = "$label ochildi. Hozir fokusdasiz."

    findViewById<TextView>(R.id.reminder_continue).setOnClickListener {
      FocusService.notifyDismissed(pkg)
      finish()
    }
    findViewById<TextView>(R.id.reminder_close).setOnClickListener {
      FocusService.notifyDismissed(pkg)
      startActivity(
        Intent(Intent.ACTION_MAIN).apply {
          addCategory(Intent.CATEGORY_HOME)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        },
      )
      finish()
    }
  }

  companion object {
    private const val TAG = "AppWatch"
    const val EXTRA_PACKAGE = "pkg"
    const val EXTRA_LABEL = "label"
  }
}
