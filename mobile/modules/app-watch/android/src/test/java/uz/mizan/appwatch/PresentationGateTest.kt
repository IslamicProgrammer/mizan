package uz.mizan.appwatch

import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

private const val ALIBABA = "com.alibaba.intl.android.apps.poseidon"

class PresentationGateTest {
  @Test
  fun `the same package twice within a second presents once`() {
    val gate = PresentationGate()

    assertNull(gate.suppressReason(ALIBABA, 0L))
    gate.markPresented(ALIBABA, 0L)

    // A second `ACTIVITY_RESUMED` from the same launch, well inside the 1s
    // strobe window -- must not present a second time.
    assertNotNull(gate.suppressReason(ALIBABA, 500L))
  }

  @Test
  fun `the strobe window expires and the same package can present again later`() {
    val gate = PresentationGate()
    gate.markPresented(ALIBABA, 0L)
    assertNull(gate.suppressReason(ALIBABA, 1_500L))
  }

  @Test
  fun `the third presentation for a package is suppressed`() {
    // Cooldown disabled here so only the dismissal count is under test --
    // see the dedicated cooldown test below for that behaviour.
    val gate = PresentationGate(postDismissCooldownMs = 0L)

    assertNull(gate.suppressReason(ALIBABA, 0L))
    gate.markPresented(ALIBABA, 0L)
    gate.markDismissed(ALIBABA, 100L)

    assertNull(gate.suppressReason(ALIBABA, 200L))
    gate.markPresented(ALIBABA, 200L)
    gate.markDismissed(ALIBABA, 300L)

    // Two dismissals banked this session -- a third presentation must not
    // happen.
    assertNotNull(gate.suppressReason(ALIBABA, 400L))
  }

  @Test
  fun `dismissing holds off the same package for the cooldown window`() {
    val gate = PresentationGate()
    gate.markPresented(ALIBABA, 0L)
    gate.markDismissed(ALIBABA, 100L)

    // `Davom etish` resumes the blocked app immediately -- without the
    // cooldown this would re-trigger the reminder it was just dismissed
    // from.
    assertNotNull(gate.suppressReason(ALIBABA, 200L))
    // Once the cooldown has actually elapsed, the package is free again.
    assertNull(gate.suppressReason(ALIBABA, 100L + 3_000L))
  }

  @Test
  fun `reset clears dismissals and the strobe guard for a fresh session`() {
    val gate = PresentationGate()
    gate.markPresented(ALIBABA, 0L)
    gate.markDismissed(ALIBABA, 100L)
    gate.markDismissed(ALIBABA, 200L)

    gate.reset()

    assertNull(gate.suppressReason(ALIBABA, 300L))
  }
}
