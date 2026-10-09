package uz.mizan.appwatch

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private const val OWN_PACKAGE = "uz.mizan.app"
private const val ALIBABA = "com.alibaba.intl.android.apps.poseidon"

class BlockGuardTest {
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
}
