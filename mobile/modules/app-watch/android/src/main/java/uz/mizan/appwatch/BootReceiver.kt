package uz.mizan.appwatch

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * `RECEIVE_BOOT_COMPLETED` -- `expo-notifications` already declares this
 * permission for its own receiver, but this module declares it again
 * itself (see `withAppWatch.js`) rather than depending on another module's
 * manifest entry to keep existing: `setAlarmClock` does not survive a
 * reboot, nothing in Android does, and a phone restarted overnight is a
 * phone with no Fajr alarm until something puts one back. This is that
 * something, run before the user could possibly have opened the app to let
 * the JS side do it with a precise `adhan` time instead.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    AlarmScheduler.recomputeAndReschedule(context)
  }
}
