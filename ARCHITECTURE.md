# app-tools internals

What each file does and why the pieces fit together the way they do. The README
covers *using* the commands; this covers *changing* them.

Every command is an RxJS pipeline. Nothing returns a promise, and the entry
points end in `.subscribe()` — an observable that is never subscribed to never
runs, which is the most common way a change here silently does nothing.

## Layout

```
scripts/
  serve.js  build.js  package.js  ssl.js   entry points — parse env, subscribe
  postinstall.js                           copies assets/ into the app on install
  libs/
    env.js                 every input: CLI args, package.json, angular.json
    cmd.js                 spawning, and the hook dispatcher
    console.js             colored output
    builder.js             base class: holds configuration + the generators
    build.js               Build extends Builder — ng build + hooks
    serve.js               Serve extends Builder — ng serve
    package.js             Package extends Build — the release flow
    env-generator.js       writes src/environments/env.ts
    build-json-generator.js  version prompt, package.json + build.json writes
    ssl.js                 dev certificate authority
```

Inheritance is `Builder → Build → Package`, so `Package` gets `generateEnv()`,
`generateBuildJson()` and `build()` for free. `Serve` extends `Builder` only.

## env.js — all input lands here

Every setting is read through this module, and `arg(name)` is the reason the same
option works three ways:

```js
arg('port')  →  --port=4900              CLI flag
             →  npm_config_port           npm --port=4900
             →  (caller's own fallback)   package.json ￫ config ￫ port
```

Callers supply the third leg themselves (`port()` reads `packageJson.config.port`).
So adding an option means adding one accessor here, and it is configurable from
both the command line and `package.json` with no extra work.

Path helpers matter because the cwd is always `frontend/`:

| | |
| --- | --- |
| `frontendDir()` | `process.cwd()` — where npm runs the script |
| `instanceDir()` | its parent — the repo root, where git and sibling packages live |
| `srcDir()`, `distDir()` | read out of `angular.json` for the selected project |

`packageJson()` uses `require()`, so it is **cached and shared**. Writing the file
does not refresh it, and mutating the returned object mutates what every later
caller sees. Capture primitives (`const previous = pkg.version`) before any write
rather than re-reading and expecting fresh values.

## cmd.js — spawning and hooks

`exec(cmd, args, options)` wraps `spawn` in an observable, always with
`shell: true`. On failure it calls `process.exit(code)` **before** erroring the
observable, so a failed command takes the whole run down immediately. That is
deliberate: it is what guarantees a failed step can never reach the commit and
tag at the end of `package`. It also means an `error` handler downstream will
usually never fire — the process is already gone.

`hook(value, options)` dispatches the two forms every hook accepts:

- a **bare path** (`./scripts/thing.js`, no spaces) is `require()`d
- anything else is a **shell command**

`node build.js` also ends in `.js` but is a command, so the extension alone
cannot decide it — hence the no-spaces rule. The two forms are not equivalent:
`require()` is synchronous and its return value is discarded, so a JS hook cannot
fail the run, while a shell hook can. That difference follows the form chosen,
not the hook point.

## The package flow

`package()` in `libs/package.js` is the only ordering-sensitive code in the repo:

```
deleteZip
promptVersion          ← asks, writes nothing
build                  ← ng build
savePackageJson        ← FIRST write; a failed build never reaches here
--afterBuild           ← sidecar packages sync + publish here
createZip
saveVersion            ← appends build.json to the zip
finalize zip
publish()              ← git add / commit / push / tag, only if version changed
```

Two constraints hold this order in place, and both are easy to break:

**Nothing is written until the build succeeds.** The version is chosen first for
ergonomics — answer the prompt, walk away — but `savePackageJson` sits after the
build so a failure leaves the working tree untouched, with no bump to unwind.

**`--afterBuild` runs before `createZip` and before `publish()`.** Before the zip
so anything it changes is in the archive; before the commit so its changes are
swept into the same commit and the same tag. A sidecar package that versions
itself with the app (see Specify's `mcp/`) depends on both. Moving the hook later
silently reintroduces the drift it exists to prevent.

`publish()` is named for git, not npm: it commits, pushes and tags. It runs only
when the version actually changed, so re-packaging at the same version is a
no-op. `build(false)` is passed `generateBuildJson = false` because `package()`
writes `build.json` itself, with the newly chosen version.

## build-json-generator.js

Owns the version. `promptVersion()` offers current / patch / minor / major /
custom and stores the answer on `this.version`; `saveBuildJson()` ignores its
argument and reads that field, so the prompt must have run first. Two artifacts
come out of it: `package.json` (the repo's version) and `dist/assets/build.json`
(what the running app reports about itself).

Note `Package` holds its own `_buildJsonGenerator` field *and* inherits
`buildJsonGenerator` from `Builder` — two instances. `package()` uses the former
throughout; using the wrong one means the prompt's answer is missing.

## Adding a hook point

1. An accessor in `env.js` (`arg('yourHook')`).
2. `cmd.hook(env.yourHook(), options)` at the right point in the pipeline,
   sequenced with `switchMap` so it is awaited — not called inside a `tap`,
   which fires it and forgets it.
3. A row in the README's table.

Pass anything the hook needs through `options.env`; `--afterBuild` supplies
`$VERSION` this way so hooks do not have to re-read `package.json`.
