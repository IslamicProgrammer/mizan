package uz.mizan.appwatch

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
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

    // Delegates to `ForegroundApp.hasUsageAccess` -- `FocusService`'s poll
    // checks the exact same thing on every tick, and a second copy of this
    // check drifting from the first is exactly how this module's screen and
    // the service it starts could disagree about whether the permission is
    // actually granted.
    Function("hasUsageAccess") {
      val ctx = appContext.reactContext ?: return@Function false
      ForegroundApp.hasUsageAccess(ctx)
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

    // A one-off, short-lookback read -- see `ForegroundApp.queryOnce`. This
    // is deliberately not the same rolling state `FocusService`'s poll
    // keeps in its own `ForegroundAppTracker`; a single JS call has no
    // session to roll a window over.
    Function("foregroundPackage") {
      val ctx = appContext.reactContext ?: return@Function null
      ForegroundApp.queryOnce(ctx)
    }

    // Launchable, not installed: `queryIntentActivities` against
    // CATEGORY_LAUNCHER is what filters out services, libraries and
    // system components the user would never recognise as "an app" on
    // their home screen.
    //
    // No icon here on purpose (task 21 fix): a phone with 150-300 launchable
    // apps would otherwise push 5-15 MB of base64 across the bridge in one
    // synchronous call, enough to freeze this exact screen on the hardware
    // it exists to be tested on. `appIcon(pkg)` fetches one icon at a time
    // instead.
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
            mapOf(
              "pkg" to pkg,
              "label" to pm.getApplicationLabel(info).toString(),
            )
          } catch (e: PackageManager.NameNotFoundException) {
            null
          }
        }
        .sortedBy { it["label"] }
        .toList()
    }

    // Decoded from the OS icon, never a bundled asset -- redrawing another
    // company's icon is a trademark problem this module must never create.
    // `null` on failure (or on a package that no longer resolves) tells the
    // JS side to fall back to a neutral letter tile. One call per app, from
    // a per-row loader, is what keeps `installedApps()` itself cheap.
    Function("appIcon") { pkg: String ->
      val pm = appContext.reactContext?.packageManager
      if (pm == null) null else cachedIconDataUri(pm, pkg)
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

    // `endsAt` is a JS `number` large enough (`Number.MAX_SAFE_INTEGER`, from
    // the test switch) that it has to come through as a `Long`, not an `Int`.
    // See the "void function" note on `requestUsageAccess` above for why this
    // is an `if` rather than an early `return@Function`.
    Function("startFocus") { blocked: List<String>, endsAt: Long ->
      val ctx = appContext.reactContext
      if (ctx != null) {
        FocusService.start(ctx, blocked, endsAt)
      }
    }

    Function("stopFocus") {
      val ctx = appContext.reactContext
      if (ctx != null) {
        FocusService.stop(ctx)
      }
    }

    Function("isFocusRunning") {
      FocusService.isRunning
    }
  }

  companion object {
    // 96dp covers the ~40dp row icon at the highest common device density
    // (xxxhdpi, 3x) with headroom; decoding an adaptive drawable at its
    // native size (often 200px+) and shipping that whole bitmap was most of
    // the per-icon cost this module used to pay on every call.
    private const val ICON_SIZE_PX = 96

    // An app's icon never changes while the process is alive, and this
    // screen's list gets scrolled past repeatedly -- a per-process cache
    // means each installed app is rasterized and base64-encoded at most
    // once, no matter how many times the row scrolls on/off screen.
    // `synchronized` because Expo module Functions are not guaranteed to
    // all run on the same thread.
    private val iconCache = mutableMapOf<String, String?>()

    private fun cachedIconDataUri(pm: PackageManager, pkg: String): String? {
      synchronized(iconCache) {
        if (iconCache.containsKey(pkg)) return iconCache[pkg]
      }
      val uri = iconDataUri(pm, pkg)
      synchronized(iconCache) { iconCache[pkg] = uri }
      return uri
    }

    // Rasterized at this exact call, from the OS's own `Drawable` -- never a
    // bundled asset standing in for a real app's icon.
    private fun iconDataUri(pm: PackageManager, pkg: String): String? {
      return try {
        val drawable = pm.getApplicationIcon(pkg)
        val bitmap = Bitmap.createBitmap(ICON_SIZE_PX, ICON_SIZE_PX, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, ICON_SIZE_PX, ICON_SIZE_PX)
        drawable.draw(canvas)
        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
      } catch (e: Exception) {
        // A rare `PackageManager` failure, or a drawable this decoder can't
        // rasterize -- `null` tells the caller to fall back to a letter tile
        // rather than showing a broken image.
        null
      }
    }
  }
}
