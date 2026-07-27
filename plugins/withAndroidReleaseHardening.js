const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const MARKER = '# CGH release hardening';
const RULES = `${MARKER}
# Keep useful line information for private mapping-based crash diagnosis while
# replacing original source filenames in the distributed APK.
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile

# Remove low-value release logging without suppressing warnings and errors.
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
`;

function withAndroidReleaseHardening(config) {
  config = withGradleProperties(config, (configWithProperties) => {
    setGradleProperty(
      configWithProperties.modResults,
      'android.r8.optimizedResourceShrinking',
      'true',
    );
    return configWithProperties;
  });

  config = withAppBuildGradle(config, (configWithGradle) => {
    if (configWithGradle.modResults.language !== 'groovy') {
      throw new Error('Portal release hardening requires a Groovy app/build.gradle.');
    }

    const contents = configWithGradle.modResults.contents.replace(
      /getDefaultProguardFile\(["']proguard-android\.txt["']\)/g,
      'getDefaultProguardFile("proguard-android-optimize.txt")',
    );
    if (!contents.includes('proguard-android-optimize.txt')) {
      throw new Error('Unable to enable the optimized Android R8 rules.');
    }
    configWithGradle.modResults.contents = contents;
    return configWithGradle;
  });

  return withDangerousMod(config, [
    'android',
    async (configWithAndroid) => {
      const rulesPath = path.join(
        configWithAndroid.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro',
      );
      const current = fs.existsSync(rulesPath)
        ? fs.readFileSync(rulesPath, 'utf8')
        : '';
      const withoutPreviousBlock = current.includes(MARKER)
        ? current.slice(0, current.indexOf(MARKER)).trimEnd()
        : current.trimEnd();
      fs.writeFileSync(
        rulesPath,
        `${withoutPreviousBlock}\n\n${RULES}`,
      );
      return configWithAndroid;
    },
  ]);
}

function setGradleProperty(properties, key, value) {
  const current = properties.find((item) => item.type === 'property' && item.key === key);
  if (current) {
    current.value = value;
    return;
  }
  properties.push({ type: 'property', key, value });
}

module.exports = withAndroidReleaseHardening;
