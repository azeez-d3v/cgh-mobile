# Open-source publication audit

This audit was completed before changing the source repository from private to public.

## Scope

- Current tracked files
- All Git paths in the repository's 11-commit history
- All reachable Git commits and file contents
- Local ignore rules
- Release workflows and referenced secret names
- Known development test credentials

## Results

Gitleaks 8.30.1 scanned all 11 commits and approximately 641 KB of reachable history on 29 July 2026. It reported zero secret findings.

A separate path and content review confirmed:

- no known live-test Student ID or password in Git history;
- no `.env.local` file in Git;
- no Android keystore, private OTA key, certificate, or provisioning profile in Git;
- no APK, AAB, R8 mapping, OTA bundle, or generated native build folder in Git;
- release workflows refer to GitHub secret names rather than values; and
- the committed OTA key is the public verification key, which is expected to be public.

The initial template license incorrectly named Expo as the copyright holder for this application's source. It was replaced with the project's MIT license attribution before publication.

Local files under `.secrets/`, `.env.local`, `.ota/`, `artifacts/`, `android/`, `node_modules/`, and local tool directories remain ignored.

## Ongoing checks

Pull requests and branch pushes run project validation. Dependabot checks npm and GitHub Actions dependencies. Contributors are asked not to place real portal pages or credentials in fixtures and issues.

An automated scanner reduces risk but does not replace review. Release keys remain in protected GitHub environments and are never meant to be recoverable from the repository or APK.

## Dependency audit

`npm audit` reported no critical or high-severity advisories on 29 July 2026. It reported 11 moderate entries in the Expo development and native-generation dependency chain.

Those entries lead to `uuid` 7.0.3 through `@expo/config-plugins` and `xcode`. The published `uuid` advisory concerns the optional output-buffer behavior of UUID versions 3, 5, and 6. The transitive `xcode` package uses `uuid.v4()` without that buffer path, and it is used while generating native projects rather than while a student views records.

npm's proposed automatic fix is an incompatible downgrade from Expo 57 to Expo 46 and from `expo-splash-screen` 57 to 55. That downgrade was not applied. Expo-compatible dependency updates will be preferred over forcing an unsupported tree.
