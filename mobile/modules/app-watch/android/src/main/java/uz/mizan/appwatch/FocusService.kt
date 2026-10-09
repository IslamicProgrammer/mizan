package uz.mizan.appwatch

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * "bu qulf emas, eslatma" (D3, task 20) -- this service never touches the
 * app it finds in front. It polls [ForegroundApp.query] and, while a
 * blocked package is there, draws a dismissible overlay; it never closes,
 * kills, or otherwise interferes with the found app.
 *
 * A single instance serves one session at a time: `startFocus` from JS
 * always targets this same component, so a second call while one is
 * already running (a restarted session, or the test switch flipping off
 * and back on) replaces the blocked list, end time, and dismissal counts
 * rather than stacking a second poller.
 */
class FocusService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var blocked: Set<String> = emptySet()
  private var endsAt: Long = 0L
  private var testMode: Boolean = false
  private var windowManager: WindowManager? = null

  // Per-package dismissal counts for this session only. Cleared on every
  // `onStartCommand` -- a fresh `startFocus` call is a fresh session, and
  // someone who dismissed twice *last* session has not said anything about
  // this one.
  private val dismissals = mutableMapOf<String, Int>()

  private var overlayView: View? = null
  private var overlayPkg: String? = null

  private val poll = object : Runnable {
    override fun run() {
      // Checked on every tick, not just scheduled once at start, so a
      // forgotten session can never outlive its own end time even if the
      // process was asleep (Doze) for part of it.
      if (System.currentTimeMillis() >= endsAt) {
        stopSelf()
        return
      }
      val fg = ForegroundApp.query(this@FocusService)
      if (fg != null && blocked.contains(fg) && dismissalsFor(fg) < MAX_DISMISSALS_PER_APP) {
        if (overlayPkg != fg) showOverlay(fg)
      } else if (overlayPkg != null) {
        // The user switched away on their own -- the reminder for the app
        // that is no longer in front has nothing left to say.
        removeOverlay()
      }
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  private fun dismissalsFor(pkg: String) = dismissals[pkg] ?: 0

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    blocked = (intent?.getStringArrayListExtra(EXTRA_BLOCKED) ?: arrayListOf()).toSet()
    endsAt = intent?.getLongExtra(EXTRA_ENDS_AT, 0L) ?: 0L
    // `Number.MAX_SAFE_INTEGER` milliseconds (what the test switch in
    // focus/apps.tsx sends) is effectively "no end time" -- millions of
    // years out. A real focus session is never within a day of that, so
    // this is a safe way to tell the two apart without a second parameter.
    testMode = endsAt - System.currentTimeMillis() > TEST_MODE_THRESHOLD_MS
    dismissals.clear()
    removeOverlay()

    // Must happen before anything else on every call, including a restart
    // of an already-running service -- Android gives a foreground-service
    // start a few seconds to call this before killing the process for it.
    startForeground(NOTIFICATION_ID, buildNotification())

    handler.removeCallbacks(poll)
    handler.post(poll)
    isRunning = true
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(poll)
    removeOverlay()
    isRunning = false
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

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
    // never an alert -- the overlay is the alert, and it already said its
    // piece twice before this notification is the only thing left running.
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Fokus rejimi", NotificationManager.IMPORTANCE_LOW),
    )
  }

  private fun showOverlay(pkg: String) {
    removeOverlay()
    // No permission, no overlay -- silently, not a crash. `Settings.canDrawOverlays`
    // can also change out from under the service mid-session (the user
    // revokes it from Settings while the app is in front), so this is
    // checked on every attempt, not once at start.
    if (!Settings.canDrawOverlays(this)) return

    val view = LayoutInflater.from(this).inflate(R.layout.reminder, null)
    val message = view.findViewById<TextView>(R.id.reminder_message)
    val dismiss = view.findViewById<TextView>(R.id.reminder_dismiss)

    message.text = if (testMode) {
      "Fokus rejimi — sinov rejimi faol"
    } else {
      // Never negative: the poll that would show zero remaining is also the
      // poll that stops the service first.
      val minutesLeft = ((endsAt - System.currentTimeMillis()) / 60_000L).coerceAtLeast(0)
      "Fokus rejimi — $minutesLeft daqiqa qoldi"
    }
    dismiss.setOnClickListener {
      // Counted on dismissal, not on display -- an overlay the user never
      // acted on must not count toward the two that end the reminders for
      // this package.
      dismissals[pkg] = dismissalsFor(pkg) + 1
      removeOverlay()
    }

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      // NOT_FOCUSABLE: typing or tapping in the app underneath must keep
      // working. This is a reminder, not a takeover -- it never steals
      // input focus from whatever the user was doing.
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    ).apply { gravity = Gravity.TOP }

    try {
      windowManager?.addView(view, params)
      overlayView = view
      overlayPkg = pkg
    } catch (e: Exception) {
      // The permission check above and this call are not atomic -- a
      // revocation landing in between must degrade to "no reminder shown
      // this tick", never a crash that takes the whole session down.
      overlayView = null
      overlayPkg = null
    }
  }

  private fun removeOverlay() {
    val view = overlayView ?: return
    try {
      windowManager?.removeView(view)
    } catch (e: Exception) {
      // Already detached -- nothing left to undo.
    }
    overlayView = null
    overlayPkg = null
  }

  companion object {
    private const val POLL_INTERVAL_MS = 2_000L
    private const val MAX_DISMISSALS_PER_APP = 2
    private const val TEST_MODE_THRESHOLD_MS = 24L * 60 * 60 * 1000
    private const val NOTIFICATION_ID = 7341
    private const val CHANNEL_ID = "focus_service"
    const val EXTRA_BLOCKED = "blocked"
    const val EXTRA_ENDS_AT = "endsAt"

    // Read by `AppWatchModule.isFocusRunning`. A plain flag this process
    // sets on itself, rather than asking `ActivityManager` to enumerate
    // running services (which needs its own permission on recent Android
    // and can only ever describe this same process's own service anyway).
    @Volatile
    var isRunning: Boolean = false
      private set

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
      // time this returns on every OEM -- clearing the flag here too is
      // what keeps a caller that checks `isFocusRunning()` immediately
      // after `stopFocus()` from seeing a stale `true`.
      isRunning = false
    }
  }
}
