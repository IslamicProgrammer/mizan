package uz.mizan.appwatch

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log

/**
 * Arms, disarms and reports the single real Fajr alarm this app ever has
 * pending -- plus a second, independent one-off alarm for "Signalni sinab
 * ko'rish" in settings, which exists so the owner can prove the whole chain
 * (`AlarmManager` -> `AlarmReceiver` -> full-screen notification -> the
 * ringing screen -> `STREAM_ALARM` sound) actually works without waiting
 * for dawn.
 *
 * `setAlarmClock`, never `setExactAndAllowWhileIdle` or `setRepeating` --
 * see the task brief: it is the only API the system leaves Doze for, and
 * the only one that puts the alarm-clock glyph in the status bar, which
 * doubles as the user's own proof an alarm is armed. Being single-fire is
 * part of that contract, not a limitation of it -- every real fire
 * reschedules the next one itself, from [AlarmReceiver], and again from
 * [BootReceiver] after a restart, because an alarm only ever set once from
 * JS is an alarm that silently stops existing the first time either of
 * those paths doesn't run.
 *
 * The test alarm uses [REQUEST_CODE_TEST], a distinct `PendingIntent`
 * request code from the real alarm's [REQUEST_CODE_REAL], and never writes
 * to [PREFS_NAME] -- so firing it, replacing it with a second tap, or never
 * firing it at all can never cancel, overwrite or reschedule the real Fajr
 * alarm, and `nextFajrAlarmAt()` never reports it.
 */
object AlarmScheduler {
  private const val TAG = "AppWatch"
  private const val PREFS_NAME = "fajr_alarm_state"
  private const val KEY_NEXT_AT = "nextAt"
  private const val KEY_TIME_OF_DAY = "timeOfDayMs"
  private const val KEY_ENABLED = "enabled"

  const val REQUEST_CODE_REAL = 9100
  const val REQUEST_CODE_TEST = 9101

  /** The deep link `AlarmClockInfo`'s "show" intent opens when the user taps
   * the status-bar alarm glyph -- the real alarm's settings screen, where
   * the toggle and the real next-ring time both live. */
  private const val SHOW_DEEP_LINK = "mizan://settings/alarm"

  fun canScheduleExact(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return am.canScheduleExactAlarms()
  }

  fun requestExactAlarmPermission(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val intent = Intent(
      Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
      Uri.parse("package:${context.packageName}"),
    ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
    context.startActivity(intent)
  }

  /**
   * Arms the real Fajr alarm for exactly `atEpochMs`, or refuses silently
   * if that is not strictly in the future -- `setAlarmClock` with a past
   * time fires immediately, which would mean enabling the toggle rings the
   * alarm on the spot. JS (computing from real Fajr times) and this
   * object's own reschedule paths are trusted to already avoid this; this
   * is the backstop for when they do not.
   */
  fun schedule(context: Context, atEpochMs: Long): Boolean {
    if (!inTheFuture(atEpochMs)) {
      Log.w(TAG, "refusing to schedule the Fajr alarm at or before now")
      return false
    }
    arm(context, atEpochMs, REQUEST_CODE_REAL, isTest = false)
    prefs(context).edit()
      .putLong(KEY_NEXT_AT, atEpochMs)
      .putLong(KEY_TIME_OF_DAY, FajrAlarmTime.timeOfDay(atEpochMs))
      .putBoolean(KEY_ENABLED, true)
      .apply()
    return true
  }

  /**
   * Arms the "Signalni sinab ko'rish" alarm -- same chain, same
   * `AlarmReceiver`, same `AlarmService`, so a successful test really does
   * prove the real alarm will work -- but under [REQUEST_CODE_TEST] and
   * with no write to [PREFS_NAME]. See the class doc for why that is what
   * keeps it from ever touching the real one.
   */
  fun scheduleTest(context: Context, atEpochMs: Long): Boolean {
    if (!inTheFuture(atEpochMs)) {
      Log.w(TAG, "refusing to schedule a test alarm at or before now")
      return false
    }
    arm(context, atEpochMs, REQUEST_CODE_TEST, isTest = true)
    return true
  }

  fun cancel(context: Context) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.cancel(firePendingIntent(context, REQUEST_CODE_REAL, isTest = false))
    prefs(context).edit()
      .putBoolean(KEY_ENABLED, false)
      .remove(KEY_NEXT_AT)
      .apply()
  }

  /** Read back from what the system actually has armed for the real alarm,
   * never the test one -- `settings/alarm.tsx` shows this, not its own
   * guess, so the two can never quietly disagree. */
  fun nextFajrAlarmAt(context: Context): Long? {
    val at = prefs(context).getLong(KEY_NEXT_AT, -1L)
    return if (at > 0) at else null
  }

  /**
   * Whether firing this alarm should also lay down tomorrow's real one.
   * Pulled out as its own pure function, rather than inlined in
   * [AlarmReceiver.onReceive], so "a test alarm never reschedules, and
   * therefore never touches, the real alarm's schedule" is something a
   * plain JUnit test can assert directly instead of only being trusted by
   * reading the receiver's code.
   */
  fun shouldRescheduleOnFire(isTest: Boolean): Boolean = !isTest

  /** Called from [AlarmReceiver] the instant today's real alarm fires --
   * lays down tomorrow's from the last time-of-day JS computed, so the
   * device is never left with nothing armed for a whole day even if the
   * app is not reopened before then. */
  fun rescheduleForTomorrow(context: Context) {
    if (!prefs(context).getBoolean(KEY_ENABLED, false)) return
    val timeOfDay = prefs(context).getLong(KEY_TIME_OF_DAY, -1L)
    if (timeOfDay < 0) return
    schedule(context, FajrAlarmTime.nextTrigger(System.currentTimeMillis(), timeOfDay))
  }

  /** Called from [BootReceiver] -- alarms do not survive a reboot, and
   * nothing else runs automatically at that moment to put the real one
   * back. */
  fun recomputeAndReschedule(context: Context) = rescheduleForTomorrow(context)

  private fun inTheFuture(atEpochMs: Long): Boolean = atEpochMs > System.currentTimeMillis()

  private fun arm(context: Context, atEpochMs: Long, requestCode: Int, isTest: Boolean) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val showIntent = PendingIntent.getActivity(
      context,
      requestCode,
      Intent(Intent.ACTION_VIEW, Uri.parse(SHOW_DEEP_LINK)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      PendingIntent.FLAG_IMMUTABLE,
    )
    am.setAlarmClock(
      AlarmManager.AlarmClockInfo(atEpochMs, showIntent),
      firePendingIntent(context, requestCode, isTest),
    )
  }

  private fun firePendingIntent(context: Context, requestCode: Int, isTest: Boolean): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java).putExtra(AlarmReceiver.EXTRA_IS_TEST, isTest)
    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  private fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
