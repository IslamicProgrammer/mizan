package uz.mizan.appwatch

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * What [AlarmReceiver] starts the instant `setAlarmClock` fires -- the part
 * of the chain that is allowed to take more than a moment. Everything here
 * happens between the alarm firing and the user escaping the ringing
 * screen, either by holding for ten seconds or by scanning: the
 * notification (carrying the full-screen intent that is what actually
 * shows the alarm over the lock screen), the looping alarm sound, and the
 * wake lock that keeps the CPU alive to play it.
 *
 * The wake lock is the one piece of this whole feature that must never be
 * gotten wrong: acquired in [onCreate] and released in [onDestroy] inside
 * a `finally`, so a crash partway through ringing still lets it go, plus a
 * bounded `acquire(timeout)` as a second backstop in case `onDestroy`
 * itself is never reached. A leaked wake lock is a flat battery by the time
 * the phone's owner wakes up on their own, hours late -- the single worst
 * bug this feature could ship with.
 */
class AlarmService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null
  private var player: MediaPlayer? = null
  private val handler = Handler(Looper.getMainLooper())
  private var rampStep = 0

  private val ramp = object : Runnable {
    override fun run() {
      val p = player
      if (p == null) return
      rampStep += 1
      val level = (rampStep.toFloat() / RAMP_STEPS).coerceIn(MIN_VOLUME, 1f)
      try {
        p.setVolume(level, level)
      } catch (e: IllegalStateException) {
        // The player can already be released by a `stopSelf` that raced
        // this tick -- nothing left to ramp.
      }
      if (rampStep < RAMP_STEPS) handler.postDelayed(this, RAMP_INTERVAL_MS)
    }
  }

  private val autoStop = Runnable { stopSelf() }

  override fun onCreate() {
    super.onCreate()
    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "$packageName:fajrAlarm").apply {
      setReferenceCounted(false)
      // The real release is `onDestroy`'s `finally`, below -- this timeout
      // is only a backstop for the path that should never run, where
      // something stops this service without Android ever calling
      // `onDestroy` on it.
      acquire(MAX_RING_MS)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIFICATION_ID, buildNotification())
    startRinging()
    handler.removeCallbacks(autoStop)
    handler.postDelayed(autoStop, MAX_RING_MS)
    // Not `START_STICKY`: tomorrow's real alarm is already rescheduled by
    // `AlarmReceiver` before this service ever starts, so an OS-initiated
    // restart of a ringing-with-nobody-watching service would accomplish
    // nothing except ringing again with no record of why.
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    try {
      stopRinging()
    } finally {
      wakeLock?.let { if (it.isHeld) it.release() }
      wakeLock = null
    }
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun startRinging() {
    val uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getValidRingtoneUri(this)
    rampStep = 0
    if (uri == null) {
      Log.w(TAG, "no alarm ringtone available on this device -- ringing silently")
      return
    }
    player = MediaPlayer().apply {
      try {
        // `STREAM_ALARM`, never the media or notification stream -- it is
        // the one stream that ignores silent mode and uses the alarm
        // volume the user set aside for exactly this.
        setAudioStreamType(AudioManager.STREAM_ALARM)
        setDataSource(this@AlarmService, uri)
        isLooping = true
        setVolume(MIN_VOLUME, MIN_VOLUME)
        prepare()
        start()
      } catch (e: Exception) {
        Log.w(TAG, "could not start the alarm sound: ${e.message}")
      }
    }
    handler.removeCallbacks(ramp)
    // Settings already prints "Asta-sekin kuchayadi" -- gradually gets
    // louder -- so opening at full volume the instant this fires would make
    // that a lie printed on screen.
    handler.post(ramp)
  }

  private fun stopRinging() {
    handler.removeCallbacks(ramp)
    handler.removeCallbacks(autoStop)
    player?.let {
      try {
        if (it.isPlaying) it.stop()
      } catch (e: IllegalStateException) {
        // Already stopped, or never successfully prepared -- nothing to undo.
      } finally {
        it.release()
      }
    }
    player = null
  }

  private fun buildNotification(): Notification {
    ensureChannel()
    val showIntent = PendingIntent.getActivity(
      this,
      NOTIFICATION_ID,
      Intent(Intent.ACTION_VIEW, Uri.parse(RINGING_DEEP_LINK)).addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP,
      ),
      PendingIntent.FLAG_IMMUTABLE,
    )
    // On Android 14+ without `USE_FULL_SCREEN_INTENT` actually granted (see
    // `AppWatchModule.canUseFullScreenIntent`), this notification -- a
    // heads-up with sound, no ringing screen -- is the entire alarm as far
    // as the user can see. An action button straight to the scan screen is
    // what keeps that case honest: without it, the only way to silence the
    // alarm is to find and open the app from a lock screen that gives no
    // hint the ringing screen even exists.
    val scanIntent = PendingIntent.getActivity(
      this,
      NOTIFICATION_ID + 1,
      Intent(Intent.ACTION_VIEW, Uri.parse(SCAN_DEEP_LINK)).addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP,
      ),
      PendingIntent.FLAG_IMMUTABLE,
    )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Bomdod")
      .setContentText("Signalni to'xtatish uchun ilovani oching")
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setOngoing(true)
      .setAutoCancel(false)
      // What actually shows this over the lock screen. On a device that has
      // refused full-screen intents, this notification still arrives as a
      // heads-up with sound -- a degraded alarm rather than no alarm at all.
      .setFullScreenIntent(showIntent, true)
      .setContentIntent(showIntent)
      .addAction(android.R.drawable.ic_menu_camera, "Skanerlash", scanIntent)
      .build()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(NotificationManager::class.java) ?: return
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Bomdod signali", NotificationManager.IMPORTANCE_HIGH).apply {
      // This service plays the alarm itself, on `STREAM_ALARM` with its own
      // volume ramp -- a second sound from the notification channel would
      // just double up on it.
      setSound(null, null)
      enableVibration(true)
    }
    nm.createNotificationChannel(channel)
  }

  companion object {
    private const val TAG = "AppWatch"
    private const val NOTIFICATION_ID = 7441
    private const val CHANNEL_ID = "fajr_alarm"
    private const val RINGING_DEEP_LINK = "mizan://alarm/ringing"
    private const val SCAN_DEEP_LINK = "mizan://alarm/scan"
    private const val MIN_VOLUME = 0.12f
    private const val RAMP_STEPS = 30
    private const val RAMP_INTERVAL_MS = 1_000L // 30 steps * 1s == the 30s ramp settings/alarm.tsx promises
    // 10 minutes -- long enough to wake someone, not long enough to drain a
    // battery or wake a household if nobody is coming to dismiss it. Also
    // the wake lock's own backstop timeout, see `onCreate`.
    private const val MAX_RING_MS = 10 * 60 * 1000L
  }
}
