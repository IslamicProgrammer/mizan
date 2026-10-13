package uz.mizan.appwatch

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

// Asia/Tashkent: fixed UTC+5, no DST -- deterministic wherever this test
// actually runs, unlike the JVM's own default zone.
private val ZONE = TimeZone.getTimeZone("Asia/Tashkent")

private fun at(year: Int, month: Int, day: Int, hour: Int, minute: Int): Long {
  val cal = Calendar.getInstance(ZONE)
  cal.set(year, month - 1, day, hour, minute, 0)
  cal.set(Calendar.MILLISECOND, 0)
  return cal.timeInMillis
}

class AlarmScheduleTest {
  // Two arbitrary, distinct times-of-day standing in for whatever two
  // different madhhab settings would hand this scheduler from the JS /
  // `adhan` side. This file never computes Fajr itself (see
  // `FajrAlarmTime`'s doc for why), so it has no way to assert on `adhan`'s
  // actual output -- only that two different inputs stay distinct all the
  // way through scheduling, which is the one thing a madhhab change could
  // otherwise get silently lost on.
  private val fajrA = FajrAlarmTime.timeOfDay(at(2026, 10, 6, 5, 32), ZONE)
  private val fajrB = FajrAlarmTime.timeOfDay(at(2026, 10, 6, 5, 36), ZONE)

  @Test
  fun `today's Fajr stays today's while it is still ahead`() {
    val now = at(2026, 10, 6, 3, 0) // well before 05:32
    assertEquals(at(2026, 10, 6, 5, 32), FajrAlarmTime.nextTrigger(now, fajrA, ZONE))
  }

  @Test
  fun `the next Fajr from a given 'now' is tomorrow's when today's has passed`() {
    val now = at(2026, 10, 6, 6, 0) // after 05:32
    assertEquals(at(2026, 10, 7, 5, 32), FajrAlarmTime.nextTrigger(now, fajrA, ZONE))
  }

  @Test
  fun `never returns a time in the past, whichever side of Fajr 'now' falls on`() {
    val beforeFajr = at(2026, 10, 6, 3, 0)
    val afterFajr = at(2026, 10, 6, 6, 0)
    assertTrue(FajrAlarmTime.nextTrigger(beforeFajr, fajrA, ZONE) > beforeFajr)
    assertTrue(FajrAlarmTime.nextTrigger(afterFajr, fajrA, ZONE) > afterFajr)
  }

  @Test
  fun `changing madhhab (a different Fajr time-of-day) changes the scheduled time`() {
    val now = at(2026, 10, 6, 3, 0)
    assertNotEquals(
      FajrAlarmTime.nextTrigger(now, fajrA, ZONE),
      FajrAlarmTime.nextTrigger(now, fajrB, ZONE),
    )
  }

  @Test
  fun `the test alarm and the real alarm never share a PendingIntent request code`() {
    // The one line standing between "Signalni sinab ko'rish" and silently
    // cancelling or overwriting the real Fajr alarm it must never touch.
    assertNotEquals(AlarmScheduler.REQUEST_CODE_REAL, AlarmScheduler.REQUEST_CODE_TEST)
  }

  @Test
  fun `only a real alarm reschedules tomorrow -- a test alarm must not touch it`() {
    assertTrue(AlarmScheduler.shouldRescheduleOnFire(isTest = false))
    assertFalse(AlarmScheduler.shouldRescheduleOnFire(isTest = true))
  }
}
