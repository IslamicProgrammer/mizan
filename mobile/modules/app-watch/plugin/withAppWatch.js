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
];

// Fully qualified, not `.FocusService` -- this plugin edits the *app's*
// manifest (package `uz.mizan.app`), not the module's own, so a
// package-relative name would resolve to a class that does not exist there.
const SERVICE_NAME = 'uz.mizan.appwatch.FocusService';

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

const withAppWatch = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    ensurePermissions(manifest);
    ensureFocusService(manifest);
    return config;
  });
};

module.exports = withAppWatch;
