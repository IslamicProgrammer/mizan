package uz.mizan.appwatch

import java.util.Calendar
import java.util.TimeZone

/**
 * Turns a single wall-clock time-of-day -- the one real Fajr time JS already
 * computed with `adhan`, for whichever madhhab the user has chosen -- into
 * the next absolute instant it occurs, never one that has already passed.
 *
 * This deliberately does not recompute Fajr's astronomy in Kotlin: `adhan`
 * is the one implementation of that calculation this project trusts, and a
 * second copy here, however carefully written, is exactly how the native
 * and JS sides could silently drift apart on the one number a prayer app
 * cannot get wrong. This exists only for the native-only paths that cannot
 * wait for JS to run at all -- a boot, or `AlarmReceiver` rescheduling
 * tomorrow the instant today's alarm fires -- and it only ever carries
 * forward the time-of-day JS last handed over via `AlarmScheduler.schedule`.
 * Being a minute or two off from the next day's real Fajr for the few hours
 * until the app is next opened (which happens the moment someone dismisses
 * today's alarm) is the acceptable tradeoff; never recomputing more than a
 * single day ahead is what keeps that drift from ever compounding.
 */
object FajrAlarmTime {
  private const val DAY_MS = 24L * 60 * 60 * 1000

  /**
   * `timeOfDayMs`'s next occurrence strictly after `now`: today's if it has
   * not happened yet, tomorrow's otherwise. Tashkent has no DST, so adding
   * a flat day and re-deriving midnight from it is exact there; a zone with
   * DST could be off by an hour across the transition, which is still far
   * inside the "good enough until JS corrects it" bar this function is
   * held to.
   */
  fun nextTrigger(now: Long, timeOfDayMs: Long, zone: TimeZone = TimeZone.getDefault()): Long {
    val todayAt = atTimeOfDay(now, timeOfDayMs, zone)
    return if (todayAt > now) todayAt else atTimeOfDay(now + DAY_MS, timeOfDayMs, zone)
  }

  /** The inverse of [nextTrigger]'s input: how far `epochMs` sits past its
   * own day's midnight. What `AlarmScheduler.schedule` persists every time
   * JS hands it a fresh, precise epoch, so the next native-only reschedule
   * has something to carry forward. */
  fun timeOfDay(epochMs: Long, zone: TimeZone = TimeZone.getDefault()): Long =
    epochMs - midnight(epochMs, zone)

  private fun atTimeOfDay(reference: Long, timeOfDayMs: Long, zone: TimeZone): Long =
    midnight(reference, zone) + timeOfDayMs

  private fun midnight(epochMs: Long, zone: TimeZone): Long {
    val cal = Calendar.getInstance(zone)
    cal.timeInMillis = epochMs
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
  }
}
