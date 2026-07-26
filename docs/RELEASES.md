# Release and OTA process

## Branches and environments

| Git branch | GitHub environment | EAS environment | EAS channel/branch | Android package |
| --- | --- | --- | --- | --- |
| `development` | `development` | `development` | `development` | `com.azeezd3v.cghmobile.dev` |
| `production` | `production` | `production` | `production` | `com.azeezd3v.cghmobile` |

Production builds are installable APK files and are not submitted to an app store.

## Required private-repository secrets

- `EXPO_TOKEN`: Expo personal access token allowed to build and publish updates for `@azeeez/cgh-mobile`.
- `PUBLIC_RELEASE_TOKEN`: least-privilege GitHub token with permission to create releases in `azeez-d3v/cgh-mobile-downloads`.

## Development OTA

Run the **OTA Development** workflow from the private repository. Development updates are published only to the `development` channel.

## Production OTA

Merge and validate the change on `production`, then run **OTA Production**. OTA can update JavaScript, styling, and bundled assets when the installed build has the same runtime version.

Changes to native dependencies, Expo SDK, permissions, app icon, package identifier, or native configuration require a new APK.

## APK release

Run **Build and Release APK** from the private repository and provide the semantic version and release notes. The workflow builds an APK with EAS, then publishes it as `CGH-Mobile.apk` in the public download repository.
