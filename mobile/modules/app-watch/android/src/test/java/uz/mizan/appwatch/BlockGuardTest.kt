package uz.mizan.appwatch

import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private const val OWN_PACKAGE = "uz.mizan.app"
private const val ALIBABA = "com.alibaba.intl.android.apps.poseidon"

class BlockGuardTest {
  // `BlockGuard`'s resolved launcher/dialer live in object-level (static)
  // state, so a test that sets them via `applyResolvedForTesting` must
  // clear it afterwards -- otherwise it leaks into every other test in
  // this file, in whatever order the runner happens to pick.
  @After
  fun resetResolvedState() {
    BlockGuard.applyResolvedForTesting(emptySet(), null)
  }

  @Test
  fun `Mizan's own package is never blockable`() {
    assertFalse(BlockGuard.isBlockable(OWN_PACKAGE, OWN_PACKAGE))
  }

  @Test
  fun `a debug build's suffixed package is still not blockable against itself`() {
    // The release id is never hardcoded in BlockGuard -- a debug build is
    // signed as uz.mizan.app.debug, and must be just as unable to lock
    // itself out as the release build is.
    assertFalse(BlockGuard.isBlockable("uz.mizan.app.debug", "uz.mizan.app.debug"))
  }

  @Test
  fun `the dialer is hard-excluded`() {
    assertTrue(BlockGuard.isHardExcluded("com.android.dialer"))
    assertFalse(BlockGuard.isBlockable("com.android.dialer", OWN_PACKAGE))
  }

  @Test
  fun `an OEM dialer under the same root is excluded too`() {
    assertTrue(BlockGuard.isHardExcluded("com.samsung.android.dialer"))
  }

  @Test
  fun `Settings is hard-excluded`() {
    assertTrue(BlockGuard.isHardExcluded("com.android.settings"))
    assertFalse(BlockGuard.isBlockable("com.android.settings", OWN_PACKAGE))
  }

  @Test
  fun `the launcher is hard-excluded, AOSP and OEM alike`() {
    assertTrue(BlockGuard.isHardExcluded("com.android.launcher3"))
    assertTrue(BlockGuard.isHardExcluded("com.google.android.apps.nexuslauncher"))
    assertTrue(BlockGuard.isHardExcluded("com.miui.home"))
    assertFalse(BlockGuard.isBlockable("com.google.android.apps.nexuslauncher", OWN_PACKAGE))
  }

  @Test
  fun `an ordinary installed app is blockable`() {
    assertTrue(BlockGuard.isHardExcluded(ALIBABA).not())
    assertTrue(BlockGuard.isBlockable(ALIBABA, OWN_PACKAGE))
  }

  // The Lawnchair field bug: a third-party launcher the static prefix list
  // had never heard of got presented the lock card over the user's own
  // home screen, with no way back in. `refresh()` itself needs a real
  // `Context` and can't run under plain JUnit -- `applyResolvedForTesting`
  // is the seam that lets the *consequence* of a successful resolution be
  // asserted directly: whatever comes back from the home-category query is
  // never blockable, launcher list or not.
  @Test
  fun `a resolved home package is never blockable, even one no prefix list knows about`() {
    val lawnchair = "app.lawnchair.lawnchair"
    assertTrue(BlockGuard.isBlockable(lawnchair, OWN_PACKAGE)) // not excluded before any resolution

    BlockGuard.applyResolvedForTesting(setOf(lawnchair), null)

    assertTrue(BlockGuard.isHardExcluded(lawnchair))
    assertFalse(BlockGuard.isBlockable(lawnchair, OWN_PACKAGE))
  }

  @Test
  fun `a resolved default dialer is never blockable, even one no prefix list knows about`() {
    val obscureDialer = "com.somevendor.calls"
    assertTrue(BlockGuard.isBlockable(obscureDialer, OWN_PACKAGE))

    BlockGuard.applyResolvedForTesting(emptySet(), obscureDialer)

    assertTrue(BlockGuard.isHardExcluded(obscureDialer))
    assertFalse(BlockGuard.isBlockable(obscureDialer, OWN_PACKAGE))
  }

  @Test
  fun `a successful home resolution does not fall back to the static launcher prefixes for a different package`() {
    // Once the real query succeeds, a package that is NOT in the resolved
    // set must be judged on its own merits -- the static prefix list must
    // not keep applying underneath a successful resolution. `com.miui.home`
    // is on the fallback list, but with a real (non-MIUI) launcher resolved
    // instead, it is just an ordinary app on this device.
    BlockGuard.applyResolvedForTesting(setOf("app.lawnchair.lawnchair"), null)

    assertFalse(BlockGuard.isHardExcluded("com.miui.home"))
  }

  @Test
  fun `the dialer is still hard-excluded by prefix when no dialer has been resolved`() {
    assertTrue(BlockGuard.isHardExcluded("com.android.dialer"))
  }
}
