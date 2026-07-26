const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_CONFIG = `
        release {
            if (project.hasProperty('CGH_UPLOAD_STORE_FILE')) {
                storeFile file(CGH_UPLOAD_STORE_FILE)
                storePassword CGH_UPLOAD_STORE_PASSWORD
                keyAlias CGH_UPLOAD_KEY_ALIAS
                keyPassword CGH_UPLOAD_KEY_PASSWORD
            }
        }`;

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (configWithGradle) => {
    if (configWithGradle.modResults.language !== 'groovy') {
      throw new Error('CGH release signing currently requires a Groovy app/build.gradle.');
    }

    let contents = configWithGradle.modResults.contents;

    if (!contents.includes("project.hasProperty('CGH_UPLOAD_STORE_FILE')")) {
      contents = contents.replace(
        /(\s+debug\s*\{[\s\S]*?keyPassword\s+'android'\s*\n\s*\})/,
        `$1${RELEASE_SIGNING_CONFIG}`,
      );
    }

    const buildTypesIndex = contents.indexOf('buildTypes {');
    const releaseBuildIndex = contents.indexOf('release {', buildTypesIndex);
    const releaseSigningIndex = contents.indexOf(
      'signingConfig signingConfigs.debug',
      releaseBuildIndex,
    );

    if (releaseSigningIndex < 0) {
      throw new Error('Unable to find the generated Android release signing configuration.');
    }

    contents =
      contents.slice(0, releaseSigningIndex) +
      "signingConfig project.hasProperty('CGH_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug" +
      contents.slice(releaseSigningIndex + 'signingConfig signingConfigs.debug'.length);

    configWithGradle.modResults.contents = contents;
    return configWithGradle;
  });
}

module.exports = withAndroidReleaseSigning;
