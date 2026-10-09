package uz.mizan.appwatch

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * "bu qulf emas, eslatma" (D3, task 20) -- this service never touches the
 * app it finds in front. It polls [ForegroundAppTracker] and, while a
 * blocked package is there, launches [ReminderActivity]; it never closes,
 * kills, or otherwise interferes with the found app.
 *
 * A single instance serves one session at a time: `startFocus` from JS
 * always targets this same component, so a second call while one is
 * already running (a restarted session, or the test switch flipping off
 * and back on) replaces the blocked list, end time, tracker and dismissal
 * counts rather than stacking a second poller.
 *
 * `START_STICKY`: the OEM skins this app ships to kill background services
 * routinely, and that is the normal case this has to survive, not an edge
 * case. A restart with a null `Intent` has no fresh blocked list or end
 * time to read -- [restoreSession] recovers the last one this process
 * persisted instead of starting with nothing to watch for (or worse,
 * running forever with an empty blocked list and never noticing).
 */
class FocusService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var blocked: Set<String> = emptySet()
  private var endsAt: Long = 0L
  private var testMode: Boolean = false

  private val tracker = ForegroundAppTracker()
  private val gate = PresentationGate()

  // Edge-triggered: the same early-return reason firing on every 900ms tick
  // forever would drown the one `adb logcat` line the owner actually needs
  // in noise. A reason is logged once when it starts being true, and again
  // only if it changes -- which still means "permission missing" reappears
  // the moment it goes missing again, just not 1,000 times a minute.
  private var lastLoggedIssue: String? = null

  private val prefs: SharedPreferences
    get() = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  private val poll = object : Runnable {
    override fun run() {
      tick()
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null) {
      // The `START_STICKY` restart this service exists to survive. There is
      // nothing fresh to read, only what this process persisted before it
      // died.
      restoreSession()
      if (blocked.isEmpty() || System.currentTimeMillis() >= endsAt) {
        Log.w(TAG, "restarted with no intent and no live session to resume -- stopping")
        stopSelf()
        return START_NOT_STICKY
      }
    } else {
      blocked = (intent.getStringArrayListExtra(EXTRA_BLOCKED) ?: arrayListOf()).toSet()
      endsAt = intent.getLongExtra(EXTRA_ENDS_AT, 0L)
      // `Number.MAX_SAFE_INTEGER` milliseconds (what the test switch in
      // focus/apps.tsx sends) is effectively "no end time" -- millions of
      // years out. A real focus session is never within a day of that, so
      // this is a safe way to tell the two apart without a second parameter.
      testMode = endsAt - System.currentTimeMillis() > TEST_MODE_THRESHOLD_MS
      persistSession()
      // A genuinely fresh session (not a sticky restart of the same one) --
      // the dismissal counts and the strobe guard belong to the session that
      // just ended, not this new one.
      gate.reset()
      lastLoggedIssue = null
    }

    // Must happen before anything else on every call, including a restart
    // of an already-running service -- Android gives a foreground-service
    // start a few seconds to call this before killing the process for it.
    startForeground(NOTIFICATION_ID, buildNotification())

    handler.removeCallbacks(poll)
    handler.post(poll)
    instance = this
    isRunning = true
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(poll)
    if (instance === this) instance = null
    isRunning = false
    // A deliberate stop (session end, or `stopFocus` from JS) is the only
    // realistic way this runs -- the OS killing the process for memory
    // does not reliably call `onDestroy` first, so the persisted session a
    // real kill needs to recover is never erased by this.
    clearPersistedSession()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun tick() {
    if (System.currentTimeMillis() >= endsAt) {
      stopSelf()
      return
    }
    if (blocked.isEmpty()) {
      logIssueOnce("blocked list is empty -- nothing to watch for")
      return
    }
    if (!ForegroundApp.hasUsageAccess(this)) {
      logIssueOnce("no usage access -- cannot tell which app is in front")
      return
    }
    if (!Settings.canDrawOverlays(this)) {
      // Not for drawing an overlay (there is none any more) -- this is what
      // lets a background service start an Activity at all. Checked on
      // every tick, not once at start: the user can revoke it from Settings
      // mid-session.
      logIssueOnce("no overlay permission -- cannot present the reminder from the background")
      return
    }

    val now = System.currentTimeMillis()
    val events = ForegroundApp.queryResumeEvents(this, tracker.windowStart(now), now)
    val fg = tracker.poll(now, events)

    if (fg == null || !blocked.contains(fg)) {
      lastLoggedIssue = null
      return
    }

    val reason = gate.suppressReason(fg, now)
    if (reason != null) {
      logIssueOnce("not presenting the reminder for $fg: $reason")
      return
    }

    lastLoggedIssue = null
    presentReminder(fg, now)
  }

  private fun logIssueOnce(message: String) {
    if (lastLoggedIssue == message) return
    lastLoggedIssue = message
    Log.w(TAG, message)
  }

  private fun presentReminder(pkg: String, now: Long) {
    gate.markPresented(pkg, now)
    val intent = Intent(this, ReminderActivity::class.java).apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP,
      )
      putExtra(ReminderActivity.EXTRA_PACKAGE, pkg)
      putExtra(ReminderActivity.EXTRA_LABEL, appLabel(pkg))
    }
    try {
      startActivity(intent)
    } catch (e: Exception) {
      // A background activity launch can still be refused (OEM battery
      // restrictions, a revoked permission between the check above and this
      // call) -- that must not crash the whole poll loop, and the guard
      // this app just spent must not be left thinking it succeeded.
      Log.w(TAG, "failed to launch ReminderActivity for $pkg: ${e.message}")
      gate.markHidden(pkg)
    }
  }

  private fun appLabel(pkg: String): String = try {
    packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
  } catch (e: PackageManager.NameNotFoundException) {
    pkg
  }

  private fun persistSession() {
    prefs.edit()
      .putStringSet(PREF_BLOCKED, blocked)
      .putLong(PREF_ENDS_AT, endsAt)
      .apply()
  }

  private fun restoreSession() {
    blocked = prefs.getStringSet(PREF_BLOCKED, emptySet()) ?: emptySet()
    endsAt = prefs.getLong(PREF_ENDS_AT, 0L)
    testMode = endsAt - System.currentTimeMillis() > TEST_MODE_THRESHOLD_MS
  }

  private fun clearPersistedSession() {
    prefs.edit().clear().apply()
  }

  private fun buildNotification(): Notification {
    ensureChannel()
    // The one line a user who finds this in their notification shade reads
    // to tell a forgotten test toggle apart from a real focus session --
    // see task 21 step 4.
    val text = if (testMode) "Sinov rejimi faol" else "Fokus seansi faol"
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Mizan")
      .setContentText(text)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(NotificationManager::class.java) ?: return
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    // LOW: this is a status indicator the user can tap into Settings for,
    // never an alert -- the reminder Activity already said its piece.
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Fokus rejimi", NotificationManager.IMPORTANCE_LOW),
    )
  }

  companion object {
    private const val TAG = "AppWatch"
    private const val POLL_INTERVAL_MS = 900L
    private const val TEST_MODE_THRESHOLD_MS = 24L * 60 * 60 * 1000
    private const val NOTIFICATION_ID = 7341
    private const val CHANNEL_ID = "focus_service"
    private const val PREFS_NAME = "focus_service_state"
    private const val PREF_BLOCKED = "blocked"
    private const val PREF_ENDS_AT = "endsAt"
    const val EXTRA_BLOCKED = "blocked"
    const val EXTRA_ENDS_AT = "endsAt"

    // Read by `AppWatchModule.isFocusRunning`. A plain flag this process
    // sets on itself, rather than asking `ActivityManager` to enumerate
    // running services (which needs its own permission on recent Android
    // and can only ever describe this same process's own service anyway).
    @Volatile
    var isRunning: Boolean = false
      private set

    // The one live instance, for `ReminderActivity` to report a dismissal
    // back to -- there is exactly one session at a time (see the class
    // doc), so a single nullable reference is the whole mechanism, not a
    // registry.
    @Volatile
    private var instance: FocusService? = null

    /** Called by `ReminderActivity` when either button is tapped. A no-op if
     * the service already stopped (the session ended while the reminder was
     * still on screen) -- there is nothing left to suppress for. */
    fun notifyDismissed(pkg: String) {
      instance?.gate?.markDismissed(pkg, System.currentTimeMillis())
    }

    fun start(ctx: Context, blocked: List<String>, endsAt: Long) {
      val intent = Intent(ctx, FocusService::class.java)
        .putStringArrayListExtra(EXTRA_BLOCKED, ArrayList(blocked))
        .putExtra(EXTRA_ENDS_AT, endsAt)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
    }

    fun stop(ctx: Context) {
      ctx.stopService(Intent(ctx, FocusService::class.java))
      // `stopService` does not guarantee `onDestroy` has already run by the
      // time this returns on every OEM -- clearing the flag and the
      // persisted session here too is what keeps a caller that checks
      // `isFocusRunning()` immediately after `stopFocus()` from seeing a
      // stale `true`, or a sticky restart from resurrecting a session the
      // user explicitly ended.
      isRunning = false
      ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
    }
  }
}
