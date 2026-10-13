package uz.mizan.appwatch

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Everything `AlarmManager.setAlarmClock` fires into, for both the real
 * Fajr alarm and "Signalni sinab ko'rish"'s test alarm -- deliberately the
 * same receiver and the same [AlarmService], so a successful test proves
 * the exact chain the real alarm depends on, not a parallel one that could
 * pass while the real path is broken.
 *
 * Kept to two calls on purpose -- see the task brief: work in a receiver is
 * killed by the OS after a few seconds, so this only reschedules tomorrow
 * (a handful of `SharedPreferences` reads/writes, skipped entirely for a
 * test alarm -- see [AlarmScheduler.shouldRescheduleOnFire]) and hands the
 * rest -- the notification, the wake lock, the sound -- to [AlarmService],
 * which is built to survive running for minutes.
 */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val isTest = intent.getBooleanExtra(EXTRA_IS_TEST, false)
    if (AlarmScheduler.shouldRescheduleOnFire(isTest)) {
      AlarmScheduler.rescheduleForTomorrow(context)
    }

    val serviceIntent = Intent(context, AlarmService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent)
    } else {
      context.startService(serviceIntent)
    }
  }

  companion object {
    const val EXTRA_IS_TEST = "isTest"
  }
}
