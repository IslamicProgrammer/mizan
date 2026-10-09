package uz.mizan.appwatch

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context

/**
 * The one place "what app is in front right now" is actually computed.
 * `AppWatchModule`'s synchronous `foregroundPackage` Function and
 * `FocusService`'s 2-second poll both need the exact same answer -- a
 * second copy of this query drifting from the first is how a one-off check
 * from JS and the reminder loop would eventually disagree about what is on
 * screen.
 *
 * See `AppWatchModule`'s original comment on why this walks the raw event
 * stream rather than `queryUsageStats`: `lastTimeUsed` there is a rolling
 * aggregate Android only flushes every few minutes, which a timely reminder
 * cannot wait on.
 */
object ForegroundApp {
  private const val LOOKBACK_MS = 10_000L

  fun query(ctx: Context): String? {
    val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val end = System.currentTimeMillis()
    val start = end - LOOKBACK_MS
    val events = usm.queryEvents(start, end)
    val event = UsageEvents.Event()
    var latestPackage: String? = null
    var latestAt = Long.MIN_VALUE
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED && event.timeStamp >= latestAt) {
        latestAt = event.timeStamp
        latestPackage = event.packageName
      }
    }
    return latestPackage
  }
}
