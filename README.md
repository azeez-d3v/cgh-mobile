# CGH Mobile

Private source repository for an unofficial, independently developed, read-only Android companion to the CGH SchoolAutomate student portal.

The app is not affiliated with, operated by, or endorsed by CGH or SchoolAutomate. The official portal remains the authoritative source for student records.

## Public distribution

- Download website: <https://azeez-d3v.github.io/cgh-mobile-downloads/>
- APK releases: <https://github.com/azeez-d3v/cgh-mobile-downloads/releases>
- Direct latest APK: <https://github.com/azeez-d3v/cgh-mobile-downloads/releases/latest/download/CGH-Mobile.apk>

No Play Store or App Store publication is configured. Production is distributed as a directly installable APK.

## Included records

- Personal information summary
- Subjects enrolled
- Enrolled load schedule
- Ledger
- Periodic dues
- Curriculum checklist and progress summary

The integration is read-only. It does not enroll or drop subjects, submit forms, change profile information, post payments, issue receipts, or modify official records.

## Local development

Requirements:

- Node.js 24
- npm
- Expo Go or an Android device

Install and start:

```bash
npm ci
npm start
```

Copy `.env.example` to `.env.local` for the local web/USB proxy workflow:

```bash
npm run proxy
```

The local proxy is for development only. Native production builds do not set `EXPO_PUBLIC_CGH_PROXY_URL` and communicate with the official HTTPS portal directly.

Preview Mode and its login control are compiled for local development only and are disabled in production builds.

## Validation

```bash
npm run validate
```

This runs TypeScript validation, parser fixtures, and Expo Doctor.

## Environments and OTA

| Source branch | GitHub environment | EAS environment | OTA channel |
| --- | --- | --- | --- |
| `development` | `development` | `development` | `development` |
| `production` | `production` | `production` | `production` |

Useful commands:

```bash
npm run build:development
npm run build:production
npm run update:development -- --message "Description"
npm run update:production -- --message "Description"
```

See [`docs/RELEASES.md`](docs/RELEASES.md) for release automation, required repository secrets, and the distinction between OTA-compatible changes and native changes that require a new APK.

## Data handling

- Passwords are used for portal authentication and are not intentionally persisted by the app.
- Previously retrieved records may be cached on the device for offline access.
- The project does not include advertising, behavioral analytics, or a maintainer-operated student database.
- Local environment files, signing credentials, APK files, native build folders, and developer tooling state are excluded from Git.
