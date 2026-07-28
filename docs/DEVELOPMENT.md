# Development

## Requirements

- Node.js 24
- npm 11 or newer
- Git
- JDK 17 for native Android builds
- Android Studio and an Android SDK for emulator or USB-device builds

Expo Go is useful for ordinary interface work. Features backed by custom native code, including signed OTA installation and Android DNS fallback, require a generated development build.

## Install

```bash
git clone https://github.com/azeez-d3v/cgh-mobile.git
cd cgh-mobile
npm ci
```

`npm ci` also runs `patch-package`. If a compatibility patch no longer applies, stop and inspect the dependency version rather than deleting the patch to make installation pass.

## Start the app

Metro/Expo development server:

```bash
npm start
```

Generated Android development build:

```bash
npm run prebuild:android
npm run android
```

The Android folder is generated and ignored. Make persistent native changes through `app.json`, `app.config.js`, an Expo config plugin under `plugins/`, or a documented package patch.

## Environment files

Copy `.env.example` to `.env.local` when local proxy settings are needed. `.env.local` is ignored.

| Variable | Purpose |
| --- | --- |
| `APP_VARIANT` | Selects `development` or `production` native identity |
| `EXPO_PUBLIC_APP_ENV` | Controls development-only preview behavior |
| `EXPO_PUBLIC_CGH_PROXY_URL` | Enables the local browser/device proxy |
| `EXPO_PUBLIC_OTA_BASE_URLS` | Optional local override for public update pointers |

Do not put release signing material or portal credentials in an `EXPO_PUBLIC_*` variable. Expo public variables are embedded in the JavaScript bundle.

## Local browser proxy

Start the local proxy:

```bash
npm run proxy
```

Start the web preview separately:

```bash
npm run dev:web
```

The proxy listens on the developer's machine and exists only to handle browser CORS limitations. Do not deploy it as a public credential relay.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start Expo development mode |
| `npm run android` | Generate/build and open Android through Expo |
| `npm run ios` | Run the untested local iOS target |
| `npm run web` | Start local web preview |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run test:parser` | Run synthetic portal parser fixtures |
| `npm run test:errors` | Check user-safe error mapping |
| `npm run validate` | Run version, type, parser, error, and Expo checks |
| `npm run test:portal` | Run the basic opt-in live portal smoke test |
| `npm run test:portal-login` | Test unknown ID, wrong password, valid login, and logout |
| `npm run proxy` | Start the local development proxy |
| `npm run bundle:android` | Export a production-style Android JS bundle |
| `npm run test:ota` | Verify a locally generated OTA package |
| `npm run version:set -- 1.2.0` | Update synchronized app version files |
| `npm run version:check` | Verify synchronized version values |

## Live portal tests

Live tests are opt-in. They contact the real portal and should be used sparingly.

PowerShell:

```powershell
$env:CGH_USERNAME = '<student-id>'
$env:CGH_PASSWORD = '<password>'
npm run test:portal-login
Remove-Item Env:CGH_USERNAME
Remove-Item Env:CGH_PASSWORD
```

Bash:

```bash
CGH_USERNAME='<student-id>' CGH_PASSWORD='<password>' npm run test:portal-login
```

Use only an account you are authorized to access. Do not put its values in shell history on a shared computer, test fixtures, source files, screenshots, or issue comments.

## Parser work

When an official page changes:

1. reproduce the problem locally with an authorized account;
2. reduce the relevant structure to a synthetic fixture;
3. remove names, IDs, dates of birth, addresses, grades, balances, and unique values;
4. add the fixture to `scripts/test-portal-parser.ts`;
5. update the smallest parser function that fixes the grouping; and
6. run the complete validation command.

Do not commit captured portal pages.

## Performance checks

Before submitting a visible change, check:

- a small or low-end Android device profile;
- long names and multi-line terms;
- the login screen with the keyboard open;
- offline and expired-session states;
- reduced motion where available;
- long record sections; and
- navigation clearances above Android system controls.

Avoid doing portal parsing or large cache work during an animation. The app's cache warming yields between modules so initial navigation stays responsive.

## Dependency updates

Use Expo's compatibility guidance rather than selecting arbitrary React Native package versions. After an update:

```bash
npm ci
npm run validate
npm run prebuild:android
```

Then build the production Android variant before removing or refreshing anything under `patches/`.
