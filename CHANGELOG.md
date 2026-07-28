# Changelog

This file records user-visible production changes. Development-only work may appear in Git history without an entry here.

## 1.1.0

- Renamed the installed application to **Portal**.
- Added clearer login validation and student-safe network error messages.
- Improved offline record handling and session-expiry recovery.
- Added resilient Android DNS resolution for networks that cannot resolve the official portal normally.
- Replaced Expo-hosted updates with signed GitHub OTA updates.
- Added signature, version, host, size, and checksum validation for OTA bundles.
- Added native release hardening, dependency compatibility patches, and release verification.
- Improved the splash screen and reduced startup flicker.
- Updated personal information, checklist, subjects, schedule, ledger, and dues layouts for smaller screens.

## 1.0.0

- First Android release with read-only access to the main student portal records.
