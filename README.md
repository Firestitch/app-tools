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
|  --include |  comma-separated paths | replaces the base set `frontend/dist,backend,framework,maintenance` |
|  --includes |  comma-separated paths | extras added on top of the base set |
|  --preBuild |  JS file or shell command | run before the build |
|  --postBuild |  JS file or shell command | run after the build, before the zip |
|  --version |  current, patch, minor, major or x.y.z | the version, without the prompt |

`--version=current` packages at the version already in package.json, so a second
app built from the same repo carries the same version as the first. Re-packaging at
the same version commits, pushes and tags nothing:

```
"package:client": "npx package --project=client --version=current --include=frontend/dist"
```

Put the flag in the script itself. `npm run package --version=…` hands it to npm,
which prints its own version instead.

The version is chosen first and nothing is written until the build succeeds, so a
failed build leaves the working tree untouched:

```
native level check → select version → ng build → write package.json → --postBuild → zip → commit, push, tag
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


# Native level
`npx native-level [args]`

|  Arg | Value  | Default |
| ------------ | ------------ | ------------ |
|  --project |  string  | first project in angular.json |

A Capacitor app's web build carries `src/assets/native.json`. A phone installs an
over-the-air web bundle only when the bundle's `level` is no higher than the level
its store build shipped with, so web code that needs a new native plugin never
reaches a binary without it. That only works if the level goes up whenever the
native plugins change, so `build` and `package` refuse to run until it has.

native.json records the native plugins its level was raised for:

```json
{
  "level": 2,
  "plugins": {
    "@capacitor/android": "6.0.0",
    "@capacitor/app": "6.0.2",
    "@capacitor/ios": "6.0.0",
    "capacitor-local-plugin": "1.0.0+3f9a0c27b1d4"
  }
}
```

- **The app root** is the nearest directory at or above the project's source that
  holds `capacitor.config.ts`, `.js` or `.json` — where `npx cap sync` runs.
- **A native plugin** is a dependency in the app root's `package.json` whose own
  `package.json` — installed in the app root's `node_modules` or any parent's —
  has a `capacitor` or `cordova` key, plus the runtimes `@capacitor/ios` and
  `@capacitor/android`, which are native by name and need no installed copy.
- **Its value** is the version the app root's `package-lock.json` pins: what
  `npm ci` installs there before `npx cap sync` builds the store binary. It reads
  the same on a developer's machine and on a CI agent that installs only the
  workspace above the app root, whose copies can be other versions. With no
  lockfile in the app root, the installed version is recorded instead.
- **A `file:` plugin**'s native source changes without its version changing, so
  it records its own `package.json` version plus the first 12 hex digits of a
  SHA-256 over its `package.json`, root `*.podspec`, `ios/` and `android/` —
  build output (`node_modules`, `build`, `.gradle`, `Pods`, `dist`) skipped and
  line endings read as LF, so Windows and Linux agree.

At the start of `npx build` and `npx package` for that project, before anything is
built or the version is asked for:

|  native.json | What happens |
| ------------ | ------------ |
|  no `plugins` yet |  the plugins are recorded at the current level; commit native.json |
|  `plugins` match |  nothing |
|  `plugins` differ |  the run exits non-zero, listing each plugin added, removed or changed |

A refused run names the fix:

```
npx native-level --project=client
```

It raises the level by one, records the plugins, and prints the old and
new level with the plugin changes. Commit native.json with the change that moved
the plugins; phones take web code built from it only once they are on a store
build of the new level.

A native dependency missing from the app root's `package-lock.json` fails the run:
run `npm install` in the app root to update it. So does a dependency whose name
contains `capacitor` or `cordova` but is installed nowhere, since nothing says
whether it is native: install the packages first.

A project with no `src/assets/native.json`, or no Capacitor config above it, is
not checked.


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
and valid for `localhost`, `local.firestitch.com` and `*.local.firestitch.com`.

It deliberately carries no IP addresses. BoringSSL (the TLS stack in Bun, and so in Claude
Code) cannot check an IP entry against the CA's name constraints and rejects the whole
certificate with `unsupported name constraint type`, even when connecting by hostname. Use
`https://localhost`, not `https://127.0.0.1`.

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
