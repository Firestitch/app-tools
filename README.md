# Serve
`npm run serve [args]`

|  Arg | Value  |  Default |
| ------------ | ------------ | ------------ |
|  --env |  string  | local |
|  --project |  string  | first project in angular.json |
|  --port |  number | package.json ￫ config ￫ port |
|  --host |  string | the project's angular.json ￫ serve ￫ options ￫ host, else `<package name>.local.firestitch.com` |
|  --secure |  boolean | false |
|  --live-reload |  boolean |  false |


# Build
`npm run build [args]`

|  Arg | Value  | Default |
| ------------ | ------------ | ------------ |
|  --env |  string  | dev |


# Package
`npm run package [args]`

|  Arg | Value  | Default |
| ------------ | ------------ | ------------ |
|  --env |  string  | production |
|  --includes |  comma-separated paths | extra directories to add to the zip |
|  --preBuild |  JS file or shell command | run before the build |
|  --postBuild |  JS file or shell command | run after the build, before the zip |

The version is chosen first and nothing is written until the build succeeds, so a
failed build leaves the working tree untouched:

```
select version → ng build → write package.json → --postBuild → zip → commit, push, tag
```

## Hooks

`--preBuild` and `--postBuild` each take **either** a path to a JS file, which is
`require()`d, **or** a shell command:

```
npx package --postBuild="cd mcp && npm run sync-version && npm publish"
npx build --preBuild=./scripts/generate-icons.js
```

A bare path with no spaces is treated as a file; anything else is run as a
command (`node build.js` is a command, not a file). A shell hook that exits
non-zero aborts the run; a JS hook cannot fail the run, because `require()`
returns nothing to check.

|  Hook | When |
| ------------ | ------------ |
|  --preBuild |  before `ng build` |
|  --postBuild |  after `ng build` — in a package run, after the version is written and before the zip and the commit |

In a `package` run `--postBuild` is deferred until the new version is in
`package.json`, and runs from the instance directory (the parent of `frontend`)
with that version in `$VERSION`. It is the point at which a sidecar package can
take the app's version and publish itself — early enough that its version bump is
zipped into this build and swept into the same commit and tag as the app it ships
with, and early enough that a failure stops the release before anything is
committed or tagged.


# Internals

[ARCHITECTURE.md](ARCHITECTURE.md) — what each file does, the package ordering
constraints, and the traps (cached `package.json`, `process.exit` on failure,
observables that never run unless subscribed).


# SSL
`npx ssl [command]`

|  Command | Description |
| ------------ | ------------ |
|  info |  Show the certificate hosts, expiry and whether the CA is trusted (default) |
|  trust |  Install the development root CA into this machine's trust store |
|  untrust |  Remove it again |
|  reissue |  Reissue only the certificate, e.g. after editing its hostnames. No re-trust needed |
|  generate |  Reissue the CA *and* the certificate. Forces every developer to rerun `trust` |

`serve --secure` uses `ssl/localhost.crt`, issued by the **Firestitch Development Root CA**
and valid for `localhost`, `local.firestitch.com`, `*.local.firestitch.com`, `127.0.0.1`
and `::1`.

Browsers only trust a certificate whose issuer is in the machine's trust store, so each
developer runs **`npx ssl trust` once per machine** to get a padlock instead of the
"Your connection is not private" interstitial. Windows will show a one-time security
confirmation; accept it. Restart the browser afterwards.

Chrome, Edge and Firefox all pick the CA up from the Windows store — Firefox enables
`security.enterprise_roots.enabled` by default there. On macOS and Linux, Firefox uses its
own store instead, so import `ssl/ca.crt` under Settings ￫ Privacy & Security ￫ Certificates.

Firefox validates certificates far more strictly than Chrome, and because this certificate
is name constrained it parses *every* subject alternative name rather than only the one it
is matching. One entry Firefox dislikes therefore rejects the whole certificate with
`SEC_ERROR_BAD_DER` on every host. Keep the hostname list conservative, and after changing
it run `npx ssl reissue` and check the result in Firefox, not just Chrome.

The CA private key ships publicly in this repo, which is only acceptable because the CA
carries a critical **name constraints** extension limiting it to the hosts above. A machine
that trusts this root still rejects a certificate it issued for any other domain, so the
key cannot be used to intercept real traffic. Never reuse it outside development.

The certificate expires in 2036 and the CA in 2046. To reissue, run `npx ssl generate` —
changing the CA means every developer must rerun `npx ssl trust`, so prefer adding hostnames
under `*.local.firestitch.com` (covered by the existing certificate) instead.
