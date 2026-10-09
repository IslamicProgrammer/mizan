package uz.mizan.appwatch

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar

/**
 * `UsageStatsManager`, not `AccessibilityService`. Decision D3 ruled out the
 * accessibility API because Google rejects accessibility-based app blockers
 * on review, repeatedly, and because the product itself is a reminder rather
 * than a lock ("bu qulf emas, eslatma") -- it only needs to notice which app
 * is in front, never to intercept or close it.
 */
class AppWatchModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AppWatch")

    Function("hasUsageAccess") {
      val ctx = appContext.reactContext ?: return@Function false
      val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = ops.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        ctx.packageName,
      )
      mode == AppOpsManager.MODE_ALLOWED
    }

    // PACKAGE_USAGE_STATS sits behind a special-access screen, not a runtime
    // prompt -- there is no dialog to show, only a settings page to open and
    // trust the user to come back from.
    Function("requestUsageAccess") {
      // A bare `return@Function` here (no value) fights the DSL's return-type
      // inference for a void function, so the guard is an `if` instead of an
      // early exit.
      val ctx = appContext.reactContext
      if (ctx != null) {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        ctx.startActivity(intent)
      }
    }

    Function("hasOverlayPermission") {
      val ctx = appContext.reactContext ?: return@Function false
      Settings.canDrawOverlays(ctx)
    }

    Function("requestOverlayPermission") {
      val ctx = appContext.reactContext
      if (ctx != null) {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${ctx.packageName}"),
        )
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        ctx.startActivity(intent)
      }
    }

    // `queryUsageStats(INTERVAL_DAILY, ...)` looks like the obvious API here,
    // but its `lastTimeUsed` is a rolling aggregate Android only flushes every
    // few minutes -- a reminder built on it would land long after the user
    // already opened the distracting app. Walking the raw event stream for
    // the newest ACTIVITY_RESUMED instead reports a switch within the same
    // second it happened, which is what a timely reminder needs.
    Function("foregroundPackage") {
      val ctx = appContext.reactContext ?: return@Function null
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
      latestPackage
    }

    // Launchable, not installed: `queryIntentActivities` against
    // CATEGORY_LAUNCHER is what filters out services, libraries and
    // system components the user would never recognise as "an app" on
    // their home screen.
    Function("installedApps") {
      val ctx = appContext.reactContext ?: return@Function emptyList<Map<String, String>>()
      val pm = ctx.packageManager
      val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      val resolved = pm.queryIntentActivities(launcherIntent, 0)
      resolved
        .asSequence()
        .map { it.activityInfo.packageName }
        .distinct()
        .filter { it != ctx.packageName }
        .mapNotNull { pkg ->
          try {
            val info = pm.getApplicationInfo(pkg, 0)
            mapOf("pkg" to pkg, "label" to pm.getApplicationLabel(info).toString())
          } catch (e: PackageManager.NameNotFoundException) {
            null
          }
        }
        .sortedBy { it["label"] }
        .toList()
    }

    Function("usageToday") {
      val ctx = appContext.reactContext ?: return@Function emptyList<Map<String, Any>>()
      val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val startOfDay = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }.timeInMillis
      val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startOfDay, System.currentTimeMillis())
      stats
        .filter { it.totalTimeInForeground > 0 && it.packageName != ctx.packageName }
        .map { mapOf("pkg" to it.packageName, "minutes" to (it.totalTimeInForeground / 60_000L).toInt()) }
    }
  }

  companion object {
    private const val LOOKBACK_MS = 10_000L
  }
}
