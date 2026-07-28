# Support

## Start with the official portal

Portal depends on the CGH SchoolAutomate service. Check whether the same account and record work in the official website before filing an app issue.

Portal cannot correct official names, subjects, schedules, balances, dues, grades, or checklist results. Those changes must go through the appropriate school office or official portal support.

## Common problems

### The portal cannot be reached

Try another network and confirm that the official website opens in a browser. Some providers have unreliable DNS for the portal. Portal 1.1.0 and newer include an Android DNS fallback, but an official service outage can still prevent fresh records from loading.

If a saved copy exists, the app may show it with an offline label. That copy may be out of date.

### Sign-in details were not accepted

Enter the same Student ID and password used by the official portal. Portal does not reset passwords. If the official website also rejects the account, use the school's official recovery or support process.

### The session expired

Sign in again for fresh records. Previously saved pages can remain available offline, but they do not refresh until a new portal session succeeds.

### A field is missing or under the wrong heading

This is usually a parser compatibility problem. Open a bug report with the app version, the affected section, and a description of the labels that are misplaced.

Do not attach the original portal HTML. If a screenshot is necessary, replace every personal, academic, and financial value with a solid block before uploading it.

### Update checking fails

Confirm that GitHub and GitHub Pages open on the same network. Update checks do not use portal credentials. A failed check does not prevent the embedded APK from running.

### Clear offline records

Use Android **Settings → Apps → Portal → Storage → Clear storage**, or uninstall Portal. Signing out closes the portal session but keeps saved records for offline use.

## A useful bug report

Include:

- Portal version;
- Android version and device model;
- whether the official website worked at the same time;
- Wi-Fi or mobile data, without posting an IP address;
- the affected Portal section;
- steps that reproduce the problem;
- expected and actual behavior; and
- whether a cached copy was shown.

Leave out student IDs, passwords, cookies, names, addresses, grades, balances, and full portal responses.

Use a [public issue](https://github.com/azeez-d3v/cgh-mobile/issues/new/choose) for ordinary bugs. Use the private route in [SECURITY.md](../SECURITY.md) for vulnerabilities.
