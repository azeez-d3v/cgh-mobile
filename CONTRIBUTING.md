# Contributing to Portal

Thanks for taking the time to improve the project. Portal sits between a student and a third-party school portal, so small mistakes can display the wrong information even when no official record is changed. Keep changes narrow, testable, and clear to another reviewer.

## Before opening an issue

Search the existing issues first. If the problem is caused by an official portal outage, wait until the portal itself works again before reporting an app bug.

Never post any of the following in a public issue:

- a student ID or password;
- session cookies or request authorization headers;
- unredacted portal HTML;
- screenshots containing names, addresses, balances, grades, schedules, or other student records;
- signing keys, keystores, environment files, or GitHub tokens.

If the report involves a security weakness, use the private process in [SECURITY.md](SECURITY.md).

## Development flow

1. Fork the repository.
2. Create a branch from `development`.
3. Keep the change focused. Unrelated formatting or dependency changes make review harder.
4. Add or update tests when changing parsers, login error handling, versions, or OTA validation.
5. Run `npm run validate`.
6. Open a pull request into `development`.

Example:

```bash
git checkout development
git pull --ff-only
git checkout -b fix/checklist-course-description
npm ci
# make and test the change
npm run validate
```

## What maintainers look for

### Portal parsing

The official pages are old and sometimes inconsistent. Parse by meaning where possible, not by a single fragile cell index. Keep field labels and values paired, normalize whitespace, and preserve a safe fallback when a table is missing.

Parser fixtures must contain invented records only. Do not copy a real student's page into the repository, even temporarily.

### Network and sessions

- Keep production portal traffic direct to the official host.
- Do not add analytics, advertising SDKs, remote logging, or a maintainer-operated credential relay.
- Do not persist passwords or session cookies.
- Keep error messages useful to students without showing raw stack traces, host resolver output, or server internals.
- Preserve session-expiry and offline-cache behavior.

### Interface changes

- Respect safe areas and Android system navigation.
- Test with the keyboard open.
- Avoid fixed text heights and ellipsized academic information.
- Check small screens and long student names.
- Prefer short lists, paging, or grouped cards over large horizontal tables.
- Keep animations inexpensive and honor the device's reduced-motion setting where supported.

### Native and update changes

Changes to native dependencies, Expo config plugins, permissions, app identity, signing, or Android resources require a new APK. JavaScript-only changes may be compatible with OTA, but they still need review against the rules in [docs/RELEASES.md](docs/RELEASES.md).

The files in `patches/` alter third-party packages after installation. A patch should contain only the smallest compatibility or security fix needed. Its documentation must state why the patch exists and when it can be removed.

## Commit and pull request guidance

Use a short subject that says what changed:

```text
fix: preserve checklist descriptions
docs: explain offline record storage
test: cover rejected portal password
```

A pull request should include:

- the problem being solved;
- the approach taken;
- the commands run;
- screenshots for visible interface changes, using preview data only;
- whether the change is JavaScript-only or requires a new APK; and
- any behavior that could not be tested.

Do not combine a dependency upgrade, redesign, parser rewrite, and release change in one pull request.

## License

By submitting a contribution, you agree that it may be distributed under the repository's [MIT License](LICENSE).
