package uz.mizan.appwatch

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Process

/**
 * The one place "what app is in front right now" is actually computed.
 * `queryEvents` hands back *events*, not a state you can poll and trust in
 * isolation -- a tick that lands between two resumes sees nothing in its
 * window, and that silence is not evidence nothing is in front, only that
 * nothing happened to resume in the last 900ms. [ForegroundAppTracker] is
 * what turns that event stream into a held answer; this object is just
 * where the Android-dependent plumbing (the raw query, and the one place
 * `hasUsageAccess` is actually checked) lives, so [AppWatchModule] and
 * [FocusService] can never drift apart on either.
 */
object ForegroundApp {
  // The JS-facing one-off call (`AppWatchModule.foregroundPackage`) has no
  // session to roll a window over -- a short, fixed lookback is the right
  // shape for "what's been in front the last few seconds", and deliberately
  // not shared with [ForegroundAppTracker]'s rolling state, which answers a
  // different question ("what is in front right now, for a poll that never
  // stops").
  private const val ONE_OFF_LOOKBACK_MS = 10_000L

  /** One `ACTIVITY_RESUMED` event, as plain data. Not `UsageEvents.Event`
   * itself, so the decision logic that consumes this ([ForegroundAppTracker],
   * [PresentationGate]) can be unit-tested without the Android framework on
   * the classpath. */
  data class ResumeEvent(val packageName: String, val timestamp: Long)

  /** `PACKAGE_USAGE_STATS` sits behind a special-access screen checked
   * through `AppOpsManager`, not a runtime permission -- this is the one
   * place that check happens. [AppWatchModule]'s `hasUsageAccess` Function
   * and [FocusService]'s poll both call this rather than each keeping their
   * own copy. */
  fun hasUsageAccess(ctx: Context): Boolean {
    val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = ops.unsafeCheckOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      ctx.packageName,
    )
    return mode == AppOpsManager.MODE_ALLOWED
  }

  /** The Android-dependent half of the rolling query: every `ACTIVITY_RESUMED`
   * event in `[start, end)`, oldest first. [ForegroundAppTracker] decides
   * what to do with them. */
  fun queryResumeEvents(ctx: Context, start: Long, end: Long): List<ResumeEvent> {
    val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usm.queryEvents(start, end)
    val event = UsageEvents.Event()
    val resumes = mutableListOf<ResumeEvent>()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
        resumes.add(ResumeEvent(event.packageName, event.timeStamp))
      }
    }
    return resumes
  }

  /** A single, stateless read with a short fixed lookback -- correct for a
   * one-off JS call, wrong for a poll loop (see [ForegroundAppTracker] for
   * why a fixed lookback both re-triggers on stale events and loses an app
   * opened more than [ONE_OFF_LOOKBACK_MS] ago). Returns null with nothing
   * logged on a missing permission: `AppWatchModule.hasUsageAccess()` is the
   * call JS already makes to explain that, and logging the same reason again
   * here on every one-off call would just be noise.
   */
  fun queryOnce(ctx: Context): String? {
    val end = System.currentTimeMillis()
    return queryResumeEvents(ctx, end - ONE_OFF_LOOKBACK_MS, end).maxByOrNull { it.timestamp }?.packageName
  }
}

/**
 * Turns [ForegroundApp]'s raw resume-event stream into a held answer for one
 * polling session. `queryEvents` is a log, not a snapshot: a tick that lands
 * between two resumes must keep reporting the last package it actually saw,
 * never fall back to null just because this particular window was quiet.
 *
 * [FocusService] owns exactly one instance per session (a fresh `startFocus`
 * call is a fresh session, same as its [PresentationGate]). It deliberately
 * does not share state with [ForegroundApp.queryOnce] -- that one-off call
 * answers a different question and has no session to roll a window over.
 *
 * Pure and Android-free on purpose: this is the one piece of the detection
 * loop with real decision logic in it, and it is unit-tested directly
 * against fake events rather than through Robolectric or a device.
 */
class ForegroundAppTracker(private val initialLookbackMs: Long = DEFAULT_INITIAL_LOOKBACK_MS) {
  // -1 rather than 0: a real `now` of exactly 0ms is not realistic, but it
  // is a value a bug could produce, and it must not be mistaken for "a poll
  // has already happened".
  private var lastQueryTime: Long = -1L

  @Volatile
  private var lastSeenPackage: String? = null

  /** The start of the window the next query should cover. The first poll of
   * a session has nothing to advance from, so it falls back to a short
   * lookback rather than asking for every event since epoch zero. Every
   * later call starts exactly where the last poll left off, which is what
   * makes this a rolling window rather than a fixed one. */
  fun windowStart(now: Long): Long {
    val last = lastQueryTime
    return if (last < 0) now - initialLookbackMs else last
  }

  /**
   * `events` must already cover `[windowStart(now), now)` -- the caller owns
   * the actual query (an Android call this class cannot make itself and stay
   * unit-testable), and must only call this once that query has actually
   * succeeded. A failed query (permission revoked mid-session, say) must
   * skip this call entirely so `lastQueryTime` is not advanced past a window
   * nothing ever looked at -- advancing it here unconditionally would lose
   * whatever happened during the failed attempt for good. The held package
   * only changes when the (successfully queried) window actually saw a
   * resume, so a quiet-but-successful tick keeps reporting the last real
   * answer instead of losing it.
   */
  fun poll(now: Long, events: List<ForegroundApp.ResumeEvent>): String? {
    val newest = events.maxByOrNull { it.timestamp }
    if (newest != null) lastSeenPackage = newest.packageName
    lastQueryTime = now
    return lastSeenPackage
  }

  companion object {
    private const val DEFAULT_INITIAL_LOOKBACK_MS = 10_000L
  }
}
