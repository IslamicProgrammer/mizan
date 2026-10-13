const { withAndroidManifest } = require('expo/config-plugins');

/**
 * CNG regenerates `android/` on every prebuild, so these permissions cannot
 * live as hand edits to AndroidManifest.xml -- they would vanish the next
 * time anyone runs `expo prebuild`. `PACKAGE_USAGE_STATS` and
 * `SYSTEM_ALERT_WINDOW` back the two special-access screens AppWatch has to
 * send the user to (neither can be granted by a runtime prompt), and
 * `QUERY_ALL_PACKAGES` is what lets `installedApps` see apps outside this
 * one's own package visibility filter on API 30+. `QUERY_ALL_PACKAGES` is
 * also Play-restricted and needs its own declaration in the Play Console --
 * that is tracked separately, not solved by this plugin.
 *
 * `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_SPECIAL_USE` are what
 * `FocusService` (task 20) needs to run at all on Android 9+ and 14+
 * respectively -- see the service's `specialUse` type below.
 *
 * Task 24 adds the Fajr alarm's own permissions. `USE_EXACT_ALARM` and
 * `SCHEDULE_EXACT_ALARM` are declared together, deliberately: the first is
 * granted at install but Play restricts it to apps whose core function
 * needs precise timing (an alarm clock qualifies), the second is the
 * fallback every app can request but which Android 14 denies by default --
 * `AlarmScheduler.canScheduleExact()` is what actually tells the two apart
 * at runtime. `USE_FULL_SCREEN_INTENT` is what lets the ringing screen show
 * over the lock screen; `WAKE_LOCK` is what lets `AlarmService` hold the
 * CPU awake to play the alarm sound. `FOREGROUND_SERVICE_MEDIA_PLAYBACK` is
 * Android 14's required per-type permission for that same service, which
 * genuinely does play media (the alarm sound) the whole time it runs.
 * `RECEIVE_BOOT_COMPLETED` is declared here even though `expo-notifications`
 * already requests it for its own receiver -- this module's `BootReceiver`
 * must not depend on another module's manifest entry to keep existing.
 */
const PERMISSIONS = [
  {
    name: 'android.permission.PACKAGE_USAGE_STATS',
    attrs: { 'tools:ignore': 'ProtectedPermissions' },
  },
  { name: 'android.permission.SYSTEM_ALERT_WINDOW' },
  { name: 'android.permission.QUERY_ALL_PACKAGES' },
  { name: 'android.permission.FOREGROUND_SERVICE' },
  { name: 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE' },
  { name: 'android.permission.USE_EXACT_ALARM' },
  { name: 'android.permission.SCHEDULE_EXACT_ALARM' },
  { name: 'android.permission.USE_FULL_SCREEN_INTENT' },
  { name: 'android.permission.WAKE_LOCK' },
  { name: 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK' },
  { name: 'android.permission.RECEIVE_BOOT_COMPLETED' },
];

// Fully qualified, not `.FocusService` -- this plugin edits the *app's*
// manifest (package `uz.mizan.app`), not the module's own, so a
// package-relative name would resolve to a class that does not exist there.
const SERVICE_NAME = 'uz.mizan.appwatch.FocusService';

// Same reasoning, same mistake to avoid, as `SERVICE_NAME` above.
const REMINDER_ACTIVITY_NAME = 'uz.mizan.appwatch.ReminderActivity';

// Task 24's own trio, same reasoning again.
const ALARM_SERVICE_NAME = 'uz.mizan.appwatch.AlarmService';
const ALARM_RECEIVER_NAME = 'uz.mizan.appwatch.AlarmReceiver';
const BOOT_RECEIVER_NAME = 'uz.mizan.appwatch.BootReceiver';

/**
 * Android 14 requires every foreground service to declare a type; the only
 * honest fit for a reminder that watches the foreground app is `specialUse`,
 * which in turn requires this property. Google reviews this exact string on
 * submission -- it has to describe what the service actually does, not read
 * like a bag of keywords chosen to pass review.
 */
const SPECIAL_USE_SUBTYPE =
  'Reminds the user when a distracting app is opened during a focus session the user started.';

function ensurePermissions(manifest) {
  if (!Array.isArray(manifest['uses-permission'])) {
    manifest['uses-permission'] = [];
  }
  const usesPermission = manifest['uses-permission'];

  for (const permission of PERMISSIONS) {
    const alreadyDeclared = usesPermission.some(
      (entry) => entry.$ && entry.$['android:name'] === permission.name,
    );
    if (alreadyDeclared) continue;
    usesPermission.push({
      $: { 'android:name': permission.name, ...permission.attrs },
    });
  }
}

function ensureFocusService(manifest) {
  const app = manifest.application && manifest.application[0];
  if (!app) return;

  if (!Array.isArray(app.service)) {
    app.service = [];
  }

  const already = app.service.some(
    (entry) => entry.$ && entry.$['android:name'] === SERVICE_NAME,
  );
  if (already) return;

  app.service.push({
    $: {
      'android:name': SERVICE_NAME,
      'android:exported': 'false',
      'android:foregroundServiceType': 'specialUse',
    },
    property: [
      {
        $: {
          'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
          'android:value': SPECIAL_USE_SUBTYPE,
        },
      },
    ],
  });
}

/**
 * The reminder itself (task 20 fix round 1), launched from `FocusService`
 * in the background -- which is only a permitted background activity
 * launch because the app holds `SYSTEM_ALERT_WINDOW`, not because of
 * anything declared here.
 *
 * `Theme.Translucent.NoTitleBar.Fullscreen`: a real Activity, not an
 * overlay view, but it must still look like a reminder floating over the
 * blocked app, not a screen of its own.
 * `singleInstance`: its own task, separate from the blocked app's --
 * finishing it (either button) reveals the blocked app's task exactly as
 * it was, never finishes or reorders it.
 * `excludeFromRecents`: a reminder that flashes up for a few seconds has no
 * business being a card in the recents switcher after it closes.
 * `exported=false`: nothing outside this app may launch it.
 */
function ensureReminderActivity(manifest) {
  const app = manifest.application && manifest.application[0];
  if (!app) return;

  if (!Array.isArray(app.activity)) {
    app.activity = [];
  }

  const already = app.activity.some(
    (entry) => entry.$ && entry.$['android:name'] === REMINDER_ACTIVITY_NAME,
  );
  if (already) return;

  app.activity.push({
    $: {
      'android:name': REMINDER_ACTIVITY_NAME,
      'android:theme': '@android:style/Theme.Translucent.NoTitleBar.Fullscreen',
      'android:launchMode': 'singleInstance',
      'android:excludeFromRecents': 'true',
      'android:exported': 'false',
    },
  });
}

/**
 * `AlarmService` (task 24) -- plays the Fajr sound and holds the wake lock.
 * `mediaPlayback` is the honest foreground-service type: it genuinely plays
 * audio the whole time it runs, unlike `FocusService`'s `specialUse` above,
 * which does nothing a named type fits.
 */
function ensureAlarmService(manifest) {
  const app = manifest.application && manifest.application[0];
  if (!app) return;

  if (!Array.isArray(app.service)) {
    app.service = [];
  }

  const already = app.service.some(
    (entry) => entry.$ && entry.$['android:name'] === ALARM_SERVICE_NAME,
  );
  if (already) return;

  app.service.push({
    $: {
      'android:name': ALARM_SERVICE_NAME,
      'android:exported': 'false',
      'android:foregroundServiceType': 'mediaPlayback',
    },
  });
}

/**
 * `AlarmReceiver` (what `setAlarmClock` fires into, for both the real and
 * the test alarm) and `BootReceiver` (what puts the real alarm back after
 * a restart). Neither is exported -- nothing outside this app ever has a
 * reason to fire either.
 */
function ensureAlarmReceivers(manifest) {
  const app = manifest.application && manifest.application[0];
  if (!app) return;

  if (!Array.isArray(app.receiver)) {
    app.receiver = [];
  }

  const already = (name) =>
    app.receiver.some((entry) => entry.$ && entry.$['android:name'] === name);

  if (!already(ALARM_RECEIVER_NAME)) {
    app.receiver.push({
      $: { 'android:name': ALARM_RECEIVER_NAME, 'android:exported': 'false' },
    });
  }

  if (!already(BOOT_RECEIVER_NAME)) {
    app.receiver.push({
      $: { 'android:name': BOOT_RECEIVER_NAME, 'android:exported': 'false' },
      'intent-filter': [
        { action: [{ $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }] },
      ],
    });
  }
}

const withAppWatch = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    ensurePermissions(manifest);
    ensureFocusService(manifest);
    ensureReminderActivity(manifest);
    ensureAlarmService(manifest);
    ensureAlarmReceivers(manifest);
    return config;
  });
};

module.exports = withAppWatch;
