<p align="center">
  <img src="assets/icon-v2.png" width="112" alt="Portal app icon">
</p>

<h1 align="center">Portal</h1>

<p align="center">
  A read-only Android companion for the CGH SchoolAutomate student portal.
</p>

<p align="center">
  <a href="https://github.com/azeez-d3v/cgh-mobile/actions/workflows/ci.yml"><img alt="Validation status" src="https://github.com/azeez-d3v/cgh-mobile/actions/workflows/ci.yml/badge.svg?branch=development"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-2f6f5e"></a>
  <a href="https://github.com/azeez-d3v/cgh-mobile-downloads/releases/latest"><img alt="Latest Android release" src="https://img.shields.io/github/v/release/azeez-d3v/cgh-mobile-downloads?label=Android"></a>
</p>

> [!IMPORTANT]
> Portal is an independent, unofficial project. It is not operated by, affiliated with, or endorsed by CGH or SchoolAutomate. The official portal and school offices remain the authoritative sources for student records.

## Why this repository is public

Portal handles information that students reasonably consider private. Its source is public so anyone can inspect what the app sends, what it keeps on the device, and how updates are verified.

The short version:

- sign-in requests go to the official CGH SchoolAutomate portal;
- the production app has no maintainer-operated proxy or student database;
- passwords are not intentionally persisted;
- retrieved records may be cached in the app's private device storage for offline access;
- there are no advertisements or behavioral analytics; and
- Android hot updates must pass signature, version, host, size, and SHA-256 checks before installation.

The full details are in [Data handling](docs/DATA_HANDLING.md) and [Architecture](docs/ARCHITECTURE.md).

## What Portal shows

- Personal information summary
- Subjects enrolled
- Enrolled load schedule
- Student ledger
- Periodic dues
- Curriculum checklist and progress
- Previously retrieved records while offline

The integration is deliberately read-only. Portal cannot enroll or drop subjects, edit a profile, submit forms, post payments, issue receipts, change grades, or modify official records.

## Current platform support

Android is the supported release platform. The application uses Expo and React Native, but an iOS release has not been prepared or tested yet. Web preview exists for local interface work only and is not part of the production app.

Production APKs are available from:

- [Download page](https://azeez-d3v.github.io/cgh-mobile-downloads/)
- [GitHub releases](https://github.com/azeez-d3v/cgh-mobile-downloads/releases)
- [Latest APK](https://github.com/azeez-d3v/cgh-mobile-downloads/releases/latest/download/CGH-Mobile.apk)

## Project layout

```text
.
├── .github/              issue templates and GitHub Actions
├── assets/               application icons and splash artwork
├── config/               public runtime configuration
├── docs/                 architecture, privacy, development, and releases
├── patches/              reviewed patches applied after npm install
├── plugins/              Expo config plugins for the Android build
├── scripts/              validation, portal tests, and OTA tooling
├── src/
│   ├── components/       application UI
│   ├── content/          in-app legal text
│   ├── ota/              signed Android update client
│   ├── services/         portal client and on-device cache
│   ├── theme/            colors, spacing, and typography
│   └── utils/            parsing, validation, and user-safe errors
├── App.tsx               application shell and screen routing
└── app.config.js         environment-specific Expo configuration
```

## Run it locally

You will need Node.js 24 and npm. Android native builds also require JDK 17 and the Android SDK.

```bash
git clone https://github.com/azeez-d3v/cgh-mobile.git
cd cgh-mobile
npm ci
npm start
```

For an Android development build:

```bash
npm run prebuild:android
npm run android
```

The committed `.env.example` contains non-secret development defaults. Copy it to `.env.local` only when you need the local browser/USB proxy:

```bash
cp .env.example .env.local
npm run proxy
```

The proxy is a local development aid. Production Android builds do not set `EXPO_PUBLIC_CGH_PROXY_URL` and communicate directly with the official HTTPS portal.

Preview Mode is also limited to local development builds. It is not present in the production APK.

## Check a change

Run the same main checks used in continuous integration:

```bash
npm run validate
```

This checks version consistency, TypeScript, parser fixtures, user-facing error mapping, and Expo dependency health.

Live login tests are optional because they contact the real portal. Credentials are read from environment variables and must never be added to fixtures, source files, screenshots, issues, or commits.

```powershell
$env:CGH_USERNAME = '<student-id>'
$env:CGH_PASSWORD = '<password>'
npm run test:portal-login
```

See [Development](docs/DEVELOPMENT.md) for setup details and every available command.

## Branches and releases

| Branch | Purpose | Android package | OTA channel |
| --- | --- | --- | --- |
| `development` | day-to-day work and pull requests | `com.azeezd3v.cghmobile.dev` | `development` |
| `production` | reviewed production source | `com.azeezd3v.cghmobile` | `production` |

Expo is used for development and native project generation. GitHub Actions builds signed APKs and signed Android OTA bundles. EAS Update is not used.

Release credentials are held in GitHub environment secrets. Keystores, private OTA keys, APKs, native build folders, local environment files, and R8 mappings are excluded from source control.

Read [Releases](docs/RELEASES.md) before changing native dependencies, application configuration, signing, or update code.

## Documentation

| Document | What it covers |
| --- | --- |
| [Architecture](docs/ARCHITECTURE.md) | Data flow, portal sessions, parsing, caching, and updates |
| [Data handling](docs/DATA_HANDLING.md) | Information used, local storage, network destinations, and deletion |
| [Development](docs/DEVELOPMENT.md) | Setup, commands, environments, tests, and patches |
| [Releases](docs/RELEASES.md) | Development APKs, production APKs, OTA, signing, and rollback |
| [Support](docs/SUPPORT.md) | Common problems and useful issue details |
| [Publication audit](docs/OPEN_SOURCE_AUDIT.md) | Secret and artifact checks completed before going public |
| [Security policy](SECURITY.md) | Private vulnerability reporting and supported versions |
| [Contributing](CONTRIBUTING.md) | Branches, pull requests, coding expectations, and review |

## Contributing

Bug reports and focused pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first. Do not include student IDs, passwords, session cookies, portal HTML containing personal records, or screenshots of private records in a public issue.

Security problems should be reported privately through the process in [SECURITY.md](SECURITY.md).

## License and names

The source code in this repository is available under the [MIT License](LICENSE).

CGH, SchoolAutomate, and related names and marks belong to their respective owners. The license covers this project's code, not third-party branding, portal content, student records, or services.
