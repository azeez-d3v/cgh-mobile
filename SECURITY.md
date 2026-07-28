# Security policy

## Supported versions

Security fixes are made for the latest production APK and its compatible signed OTA channel. Older APK versions may no longer receive fixes after a native upgrade.

| Version | Supported |
| --- | --- |
| Latest production release | Yes |
| Development builds | Best effort |
| Older production releases | No |

## Report a vulnerability privately

Please use [GitHub's private vulnerability reporting form](https://github.com/azeez-d3v/cgh-mobile/security/advisories/new). Do not open a public issue for a vulnerability that could expose student information, portal credentials, update signing, or release infrastructure.

Include:

- the affected app version and commit, if known;
- clear reproduction steps using invented or redacted data;
- the impact you observed;
- whether the issue requires a native APK or is in JavaScript; and
- a suggested fix, if you have one.

Do not send real portal passwords, session cookies, private student records, APK signing material, or OTA private keys. If a portal password was exposed while testing, change it through the official service immediately.

You should receive an acknowledgement within seven days. A fix may be released before technical details are published when users need time to update.

## Security boundaries

Portal is a read-only client for a third-party service. This policy covers the application code, its signed update mechanism, and the project's GitHub release automation.

Problems in the official CGH or SchoolAutomate service are outside this project's control. Report those through the service owner's official channel. Do not test the official service in a way that accesses another person's records, changes data, or disrupts availability.

## Update trust

Production APKs are Android-signed. JavaScript OTA manifests are signed separately with Ed25519, and the client checks the manifest signature, installed app version, download host, bundle size, and SHA-256 digest.

The public key is intentionally committed at `config/ota-public-key.txt`. The corresponding private key and Android signing keystore are not part of the repository.
