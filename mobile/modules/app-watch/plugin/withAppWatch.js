const { withAndroidManifest } = require('expo/config-plugins');

/**
 * CNG regenerates `android/` on every prebuild, so these three permissions
 * cannot live as hand edits to AndroidManifest.xml -- they would vanish the
 * next time anyone runs `expo prebuild`. `PACKAGE_USAGE_STATS` and
 * `SYSTEM_ALERT_WINDOW` back the two special-access screens AppWatch has to
 * send the user to (neither can be granted by a runtime prompt), and
 * `QUERY_ALL_PACKAGES` is what lets `installedApps` see apps outside this
 * one's own package visibility filter on API 30+. `QUERY_ALL_PACKAGES` is
 * also Play-restricted and needs its own declaration in the Play Console --
 * that is tracked separately, not solved by this plugin.
 */
const PERMISSIONS = [
  {
    name: 'android.permission.PACKAGE_USAGE_STATS',
    attrs: { 'tools:ignore': 'ProtectedPermissions' },
  },
  { name: 'android.permission.SYSTEM_ALERT_WINDOW' },
  { name: 'android.permission.QUERY_ALL_PACKAGES' },
];

const withAppWatch = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
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

    return config;
  });
};

module.exports = withAppWatch;
