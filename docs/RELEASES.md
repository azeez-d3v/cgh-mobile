# GitHub APK and OTA releases

## Branches and environments

| Git branch | GitHub environment | OTA channel | Android package |
| --- | --- | --- | --- |
| `development` | `development` | `development` | `com.azeezd3v.cghmobile.dev` |
| `production` | `production` | `production` | `com.azeezd3v.cghmobile` |

Expo is used for development and `expo prebuild`. GitHub Actions performs APK
and OTA release work; EAS Update is not part of the release path.

## Required private-repository secrets

- `OTA_SIGNING_PRIVATE_KEY`: PKCS#8 Ed25519 private key used to sign exact
  `update.json` bytes.
- `PUBLIC_RELEASE_TOKEN`: GitHub token permitted to create releases and update
  the `production` Pages branch in `azeez-d3v/cgh-mobile-downloads`.
- `ANDROID_KEYSTORE_BASE64`: Base64 Android release keystore.
- `ANDROID_KEYSTORE_PASSWORD`: Release keystore password.
- `ANDROID_KEY_ALIAS`: Release key alias.
- `ANDROID_KEY_PASSWORD`: Release key password.

The OTA public key is safe to commit and lives in
`config/ota-public-key.txt`. Signing and keystore private material must stay in
GitHub Secrets and the ignored local `.secrets/` directory.

## Development APK

Run **Build Development APK** from the `development` branch. It creates a debug
APK as a private workflow artifact retained for 14 days. Use this build to test
native updater behavior; Expo Go does not contain the OTA native module.

## Development OTA

Run **OTA Development** from `development`. The workflow:

1. validates the source;
2. exports an Android JavaScript bundle and bundled assets;
3. creates a ZIP, SHA-256 checksum, signed manifest, and signature;
4. publishes an OTA prerelease in the public download repository; and
5. updates the version-scoped GitHub Pages pointer under
   `ota/development/<app-version>/`.

## Production OTA

Merge and validate the change on `production`, then run **OTA Production**.
Bundle numbers increase automatically within each app version; an optional
manual number must be higher than its published pointer. Installed production
APKs check only `ota/production/<app-version>/update.json`.

OTA is appropriate for JavaScript, styling, parser logic, and already-supported
assets. Changes to native dependencies, Expo/React Native versions, permissions,
config plugins, application identity, icon resources, or native configuration
require a new APK and app-version bump.

The target app version in the signed manifest must exactly match the installed
APK. Version-scoped pointers keep the last compatible update available to older
APKs after a newer APK is released.

## APK release

Before committing an APK release, set the version in all source manifests:

```sh
npm run version:set -- 1.1.0
npm run validate
```

Commit and merge those version files to `production`. Then run **Build and
Release APK** on `production` with the same semantic version and release notes.
The workflow rejects a version that does not match the committed source, which
prevents future OTA manifests from targeting the wrong APK. GitHub Actions:

1. validates the source;
2. generates the Android project;
3. restores the release keystore;
4. builds and verifies the signed release APK;
5. publishes `CGH-Mobile.apk` and its SHA-256 checksum to the public repository.

The public download site resolves the latest non-prerelease APK release. OTA
releases are prereleases so they cannot replace the website’s APK target.

## Rollback

The updater retains up to three bundles. If a newly selected OTA bundle crashes
during startup, the native recovery handler returns to the closest retained
bundle or the APK’s embedded bundle. A local patch also prevents an embedded
bundle crash from causing an updater restart loop and rejects ZIP path traversal.
