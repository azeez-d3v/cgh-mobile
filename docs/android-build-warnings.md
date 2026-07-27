# Android build warning audit

Audited against the production Android build for Portal 1.1.0.

## Resolved in this repository

- Expo module Gradle plugin: replaced the deprecated library `targetSdk` DSL and
  `lintOptions` access with the current `testOptions.targetSdk`,
  `lint.targetSdk`, and `lint.abortOnError` APIs.
- Expo modules C++ bridge: replaced the deprecated Boolean
  `RawPropsParser` constructor with the current zero-argument constructor.
- NetInfo: replaced the deprecated `onCatalystInstanceDestroy` override with
  `invalidate`.
- OTA native module: replaced `GlobalScope`, handled a nullable bundle path,
  and removed raw native exception text from the recovery message.

These compatibility fixes are reproducible through `patch-package` and are
verified by `npm ci`.

## Remaining upstream compatibility warnings

The release compiler still reports deprecations inside Expo SDK 57,
React Native Reanimated 4.5.0, and React Native Safe Area Context 5.7.0.
Those versions are the versions selected by Expo's dependency compatibility
check. They are not APIs called by application-owned source.

The Gradle warning audit also reports Gradle 10 migration notices from generated
Expo/React Native Gradle scripts and Android Gradle Plugin internals. The app
currently builds with Gradle 9.3.1 and Android Gradle Plugin 8.12.0. Rewriting
generated third-party build logic locally would create a larger upgrade risk
than retaining the warnings until the compatible upstream packages migrate.

Run the audit with:

```powershell
$env:APP_VARIANT = 'production'
$env:EXPO_PUBLIC_APP_ENV = 'production'
npx expo prebuild --platform android --clean --no-install
cd android
.\gradlew.bat :app:compileReleaseKotlin --warning-mode all --no-daemon
```

The acceptance gate is: no application-owned deprecated API usage, successful
production compilation, and a documented owner for remaining upstream output.
