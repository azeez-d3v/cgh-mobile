# Portal 1.1.0 verification

## Automated and live checks

- `npm ci`: all three compatibility patches apply cleanly.
- `npm run validate`: version, TypeScript, parser, safe-error, and Expo Doctor
  checks pass (20/20 Expo checks).
- Live portal authentication: unknown Student ID, wrong password, valid
  credentials, and logout scenarios pass. The portal does not reliably reveal
  which credential is wrong at its final authentication step, so both real
  rejected-credential cases intentionally use the accurate, non-enumerating
  “Student ID or password” message.
- Live read-only portal smoke test: login, all six record modules, row/header
  alignment checks, and logout pass.
- Clean production Android prebuild and signed release assembly pass.

## APK inspection

| Check | Result |
| --- | --- |
| Package | `com.azeezd3v.cghmobile` (unchanged) |
| Version | `1.1.0` / version code `1001000` |
| Launcher label | `Portal` |
| ABIs | `arm64-v8a`, `armeabi-v7a` |
| Signing continuity | Same SHA-256 signing-certificate digest as 1.0.1 |
| Release signature | APK Signature Scheme v2 verified |
| Hermes | Hermes bytecode bundle present |
| Source maps / JS / TS source | None packaged |
| R8 | Minification, optimization, obfuscation, and resource shrinking executed |
| R8 mapping | Generated privately; absent from APK |
| Credential scan | No test Student ID or password present |
| Private-key / keystore scan | No private signing material present |
| Decompiler inspection | 2,743 one-letter Java source filenames; app native references obfuscated |

## Size

- 1.0.1 APK: 51,966,244 bytes
- 1.1.0 APK: 44,306,828 bytes
- Reduction: **14.7%**

Long subjects, schedules, ledger entries, periodic dues, and checklist rows are
now rendered in bounded pages instead of mounting the complete datasets.
Dashboard cache warming is deferred until initial interactions finish, Android
lists use smaller render windows, and profile images use memory/disk caching
without transition flicker.

## Physical-device follow-up

No Android device was visible to `adb` during the final local run. Cold/warm
startup visuals, low-memory behavior, offline/reconnect, expired-session
recovery, update installation/rollback, and frame/memory measurements therefore
remain release-candidate smoke checks on the target phone.
