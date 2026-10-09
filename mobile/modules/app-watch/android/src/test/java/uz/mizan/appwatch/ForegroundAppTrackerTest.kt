package uz.mizan.appwatch

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

private const val ALIBABA = "com.alibaba.intl.android.apps.poseidon"

class ForegroundAppTrackerTest {
  @Test
  fun `a poll with no events keeps reporting the last answer, not null`() {
    val tracker = ForegroundAppTracker()
    val t0 = 1_000_000L

    val first = tracker.poll(t0, listOf(ForegroundApp.ResumeEvent(ALIBABA, t0 - 300)))
    assertEquals(ALIBABA, first)

    // The window `[t0, t0 + 900)` saw nothing resume -- that is a quiet
    // tick, not evidence the app closed.
    val second = tracker.poll(t0 + 900, emptyList())
    assertNotNull(second)
    assertEquals(ALIBABA, second)
  }

  @Test
  fun `the first poll of a session has nothing to advance from, so it looks back a fixed amount`() {
    val tracker = ForegroundAppTracker(initialLookbackMs = 10_000L)
    assertEquals(40_000L, tracker.windowStart(50_000L))
  }

  @Test
  fun `every later window starts exactly where the previous poll left off`() {
    val tracker = ForegroundAppTracker()
    tracker.poll(1_000L, emptyList())
    assertEquals(1_000L, tracker.windowStart(5_000L))
  }

  @Test
  fun `a newer resume replaces the held package`() {
    val tracker = ForegroundAppTracker()
    tracker.poll(1_000L, listOf(ForegroundApp.ResumeEvent("com.a", 900L)))
    val result = tracker.poll(2_000L, listOf(ForegroundApp.ResumeEvent("com.b", 1_500L)))
    assertEquals("com.b", result)
  }

  @Test
  fun `several resumes in one window keep only the newest`() {
    val tracker = ForegroundAppTracker()
    val result = tracker.poll(
      1_000L,
      listOf(
        ForegroundApp.ResumeEvent("com.a", 100L),
        ForegroundApp.ResumeEvent("com.b", 300L),
        ForegroundApp.ResumeEvent("com.a", 200L),
      ),
    )
    assertEquals("com.b", result)
  }
}
