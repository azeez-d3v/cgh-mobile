# Data handling

Portal is designed without a maintainer-operated account system, analytics service, advertising SDK, or student-record database. Production data moves between the installed app and the official portal.

## Information used by the app

| Information | Why it is used | Where it is kept |
| --- | --- | --- |
| Student ID | Portal sign-in and matching an offline summary to the student | In memory during use; also present in the cached student summary |
| Password | Portal sign-in | Passed to the login request; not intentionally written to persistent storage |
| Session cookies | Keep the official portal session active | Process memory only |
| Personal information | Display the requested profile summary | May be cached in the app's private AsyncStorage |
| Subjects, schedule, and checklist | Display academic records | May be cached in the app's private AsyncStorage |
| Ledger and periodic dues | Display financial records | May be cached in the app's private AsyncStorage |
| App and bundle version | Decide whether a compatible update exists | Stored locally and included in public update-file requests |

AsyncStorage is application-private storage provided by Android, but the cached record JSON is not separately encrypted by Portal. A person who can unlock, root, back up, or otherwise fully access the device may be able to read it.

## Network destinations

### Official portal

The Android production app sends sign-in, session, record, and portal-image requests to:

```text
https://automate.cghc.edu.ph
```

The official service receives the same account information needed for its web login. Its own terms, server logs, security controls, and privacy practices are managed by the service owner, not by this project.

### DNS resolution

On Android, the app may use Cloudflare's DNS-over-HTTPS endpoint to resolve domain names when normal provider DNS is unreliable. A DNS request contains the domain being resolved. It does not contain the portal password, session cookie, or returned student page.

### Update hosting

The app checks public files hosted through GitHub Pages and GitHub's raw-content service. Compatible bundles are downloaded from GitHub Releases.

These requests can disclose ordinary connection metadata such as IP address, app update path, date, and time to the network and hosting provider. Portal credentials and retrieved records are not added to update requests.

## What the project does not collect

The production application does not intentionally:

- send student credentials or records to a server operated by the maintainer;
- sell or rent information;
- display advertising;
- track behavior across apps or websites;
- use a behavioral analytics SDK;
- build a remote student profile; or
- upload the local record cache.

The source code is public so these statements can be checked against the application implementation and release workflow.

## Offline records and retention

After a successful sign-in, the app warms the cache with available modules. Later successful requests replace the corresponding saved copy.

Signing out ends the live portal session but does not erase saved offline records. This allows the same student to see the latest saved copy during a later portal or network outage.

To remove those records, use Android's **Settings → Apps → Portal → Storage → Clear storage**, or uninstall the app. Clearing only the operating system's temporary cache may not remove AsyncStorage.

Do not rely on offline records for time-sensitive decisions. They can be incomplete or out of date, and the official portal remains authoritative.

## Logs and error reports

Production screens use simplified messages and do not intentionally display raw network exceptions. The project does not automatically upload diagnostics.

If you choose to file a GitHub issue, the text and attachments you submit become subject to GitHub's handling and the repository's visibility. Redact all student information before posting. Never attach a real portal response or session cookie.

## Development tools

Local web preview can use `scripts/portal-proxy.ts` on the developer's own machine. It is not enabled in production builds and is not a hosted part of the app.

Developers running live login tests supply credentials through local environment variables. Those variables, `.env.local`, signing files, and generated artifacts are ignored by Git.

## Changes to this behavior

A contribution that adds a new network destination, persistent identifier, analytics tool, remote log collector, account relay, or new category of stored information must update this document and the in-app privacy text in the same pull request.
