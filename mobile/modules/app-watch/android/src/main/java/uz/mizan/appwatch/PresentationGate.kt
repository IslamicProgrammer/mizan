package uz.mizan.appwatch

/**
 * Decides whether [FocusService] should present the reminder for a blocked
 * package right now, and holds the two numbers that keep it a reminder
 * rather than a strobe light:
 *
 * - the package currently on screen and when it was presented, so several
 *   `ACTIVITY_RESUMED` events from one app launch present the reminder
 *   once, not once per event (the strobe guard)
 * - how many times each package has been dismissed this session, and when
 *   the most recent dismissal was. Finishing the reminder Activity hands
 *   the blocked app's task back to the front -- which resumes it, which
 *   looks identical to the user opening it again unless a dismissal buys a
 *   few seconds of silence first
 *
 * Pure and Android-free, like [ForegroundAppTracker] -- unit-tested
 * directly against a fake clock rather than through Robolectric or a
 * device.
 */
class PresentationGate(
  private val maxDismissalsPerApp: Int = DEFAULT_MAX_DISMISSALS_PER_APP,
  private val strobeWindowMs: Long = DEFAULT_STROBE_WINDOW_MS,
  private val postDismissCooldownMs: Long = DEFAULT_POST_DISMISS_COOLDOWN_MS,
) {
  @Volatile
  private var visiblePackage: String? = null
  private var visibleSince: Long = 0L

  // Per-package for this session only -- cleared by `reset()`, which
  // `FocusService` calls on every fresh `startFocus`. A package dismissed
  // twice last session has not said anything about this one.
  private val dismissals = mutableMapOf<String, Int>()
  private val dismissedAt = mutableMapOf<String, Long>()

  // "5 daqiqa kutish" (block-screen.md) -- the same suppression mechanism
  // this class already is, extended rather than duplicated. Unlike the
  // dismissal cutoff above, this one is not reminder-only: snoozing is a
  // deliberate, mode-agnostic choice the screen offers in lock mode too,
  // so it is checked in [suppressReason] unconditionally, never behind
  // `enforceDismissalRules`.
  private val snoozedUntil = mutableMapOf<String, Long>()

  fun reset() {
    visiblePackage = null
    dismissals.clear()
    dismissedAt.clear()
    snoozedUntil.clear()
  }

  fun dismissalsFor(pkg: String): Int = dismissals[pkg] ?: 0

  /**
   * Null means "present it". A non-null string is the reason not to -- a
   * reason rather than a boolean is what lets [FocusService] log the real
   * one instead of exiting quietly, which is the whole problem task 20's
   * fix round is about.
   *
   * `enforceDismissalRules` is `false` for a lock-mode session (task 23).
   * The count-and-cooldown rules below exist only because the reminder has
   * a `Davom etish` button that resumes the blocked app and must not
   * immediately re-trigger itself, and only because dismissing the
   * reminder twice is this app's signal that the user has decided and
   * should be left alone. Lock mode has neither: there is no button back
   * into the blocked app, and the whole point of choosing lock over remind
   * is that the user's own dismissals must not be the thing that lets them
   * back in. The strobe guard is left enforced either way -- it is not a
   * reminder-specific courtesy, it is what keeps one app launch from being
   * presented twice over a single burst of `ACTIVITY_RESUMED` events.
   */
  fun suppressReason(pkg: String, now: Long, enforceDismissalRules: Boolean = true): String? {
    val snoozeEnds = snoozedUntil[pkg]
    if (snoozeEnds != null && now < snoozeEnds) {
      return "snoozed for ${snoozeEnds - now}ms more"
    }
    if (enforceDismissalRules) {
      val count = dismissalsFor(pkg)
      if (count >= maxDismissalsPerApp) {
        return "dismissed $count time(s) already this session, at or past the limit of $maxDismissalsPerApp"
      }
      val lastDismiss = dismissedAt[pkg]
      if (lastDismiss != null && now - lastDismiss < postDismissCooldownMs) {
        return "dismissed ${now - lastDismiss}ms ago, inside the ${postDismissCooldownMs}ms post-dismiss cooldown"
      }
    }
    if (visiblePackage == pkg && now - visibleSince < strobeWindowMs) {
      return "already presented ${now - visibleSince}ms ago, inside the ${strobeWindowMs}ms strobe window"
    }
    return null
  }

  fun markPresented(pkg: String, now: Long) {
    visiblePackage = pkg
    visibleSince = now
  }

  /** The reminder for `pkg` is off screen -- clearing the strobe guard here
   * (rather than only on a timeout) is what lets a genuinely new launch of
   * the same app present again once its own reminder has actually gone. */
  fun markHidden(pkg: String) {
    if (visiblePackage == pkg) visiblePackage = null
  }

  /** Called once, regardless of which button the user tapped -- both
   * `Davom etish` and `Yopish` end the reminder, and both are what the
   * cooldown and the two-dismissal cutoff are counting. */
  fun markDismissed(pkg: String, now: Long) {
    dismissals[pkg] = dismissalsFor(pkg) + 1
    dismissedAt[pkg] = now
    markHidden(pkg)
  }

  /** "5 daqiqa kutish" -- `pkg` is not presentable again until `durationMs`
   * has passed, in either mode. `markHidden` alongside it clears the strobe
   * guard too, so the resumed app is not immediately re-flagged as "already
   * presented" the moment the snooze window itself expires. */
  fun snooze(pkg: String, now: Long, durationMs: Long = DEFAULT_SNOOZE_MS) {
    snoozedUntil[pkg] = now + durationMs
    markHidden(pkg)
  }

  companion object {
    private const val DEFAULT_MAX_DISMISSALS_PER_APP = 2
    private const val DEFAULT_STROBE_WINDOW_MS = 1_000L
    private const val DEFAULT_POST_DISMISS_COOLDOWN_MS = 3_000L
    private const val DEFAULT_SNOOZE_MS = 5 * 60 * 1_000L
  }
}
