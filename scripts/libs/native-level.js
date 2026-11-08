const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const console = require('./console');
const env = require('./env');


// The files that make a directory a Capacitor app root: where `npx cap sync` runs,
// so its package.json is what the native shells are built from.
const CAPACITOR_CONFIGS = ['capacitor.config.ts', 'capacitor.config.js', 'capacitor.config.json'];

// The native runtimes carry no `capacitor` key of their own, but moving either one
// moves every native binary.
const RUNTIMES = ['@capacitor/ios', '@capacitor/android'];

// What a local plugin's build leaves beside its source. It differs machine to
// machine and says nothing about the native code the plugin compiles from.
const HASH_SKIP = ['node_modules', 'build', '.gradle', 'Pods', 'dist'];


// Keeps native.json's level honest. A phone installs an over-the-air web bundle
// only when the bundle's level is no higher than the one its store build shipped
// with, so web code that calls a new native plugin never lands on a binary
// without it. That only holds if someone raises the level whenever the plugins
// change, and people forget. So native.json also records the native plugin set
// its level was raised for, and a build whose plugins no longer match it is
// refused until the level is raised.
//
// Only a project whose source holds assets/native.json is a Capacitor app's web
// build. Every other project is left exactly as it was.
class NativeLevel {
  project = null;
  file = null;
  appRoot = null;

  constructor() {
    this.project = env.project();
    this.file = path.join(env.srcDir(), 'assets/native.json');
    this.appRoot = fs.existsSync(this.file) ? this._findAppRoot(env.srcDir()) : null;
  }

  // Run at the start of `build` and `package`, before anything is built or the
  // version is asked for. Exits the process when the plugins moved without the
  // level, rather than throwing into the build's observable chain: an exit code
  // set here is the one npm and CI see.
  check() {
    if (!this.appRoot) {
      return;
    }

    const native = this._read();
    const plugins = this.plugins();

    // A native.json written before the plugins were recorded: the set pinned
    // now is taken as the one its level was raised for. Nothing is refused, but
    // the file now differs from git and has to be committed to count.
    if (!native.plugins) {
      this._write(native, native.level, plugins);
      console.log(`Recorded ${Object.keys(plugins).length} native plugins at level ${native.level} in ${this._relativeFile()}; commit it.`);
      return;
    }

    const changes = this.changes(native.plugins, plugins);

    if (!changes.length) {
      return;
    }

    this._fail([
      `The ${this.project} app's native plugins are not the ones native.json level ${native.level} was recorded for:`,
      ...changes,
      `A phone on a level ${native.level} store build would install this web code without the native code it calls.`,
      `Run npx native-level --project=${this.project} to raise native.json to level ${native.level + 1} and record them, then commit native.json.`,
    ]);
  }

  // `npx native-level`: the level goes up by one and the plugins pinned now are
  // recorded as the set that level is for. Raising it with no plugin change is
  // allowed — a native change can live outside the plugins, in the shells' own
  // projects, and still need a new store build.
  raise() {
    if (!fs.existsSync(this.file)) {
      this._fail([`The ${this.project} project has no ${this._relativeFile()}, so it has no native level to raise.`]);
    }

    if (!this.appRoot) {
      this._fail([`No ${CAPACITOR_CONFIGS.join(' or ')} at or above ${env.srcDir()}, so ${this.project} is not a Capacitor app.`]);
    }

    const native = this._read();
    const plugins = this.plugins();
    const level = native.level + 1;
    const changes = native.plugins ? this.changes(native.plugins, plugins) : [];

    this._write(native, level, plugins);

    console.success(`native.json level ${native.level} -> ${level}`);

    if (!native.plugins) {
      console.log(`Recorded ${Object.keys(plugins).length} native plugins for the first time.`);
    } else if (!changes.length) {
      console.log('No native plugin changed.');
    } else {
      changes.forEach((change) => console.log(change));
    }

    console.log(`Commit ${this._relativeFile()}.`);
  }

  // The app root's native dependencies, by name in sorted order, each with the
  // version the app root's package-lock.json pins. That is what `npm ci` installs
  // there before `npx cap sync` builds a store binary, and it reads the same on a
  // developer's machine and on a CI agent that never installs the app root — the
  // copies installed elsewhere in a workspace can be other versions. An app root
  // with no lockfile has nothing pinned, so the installed version is recorded.
  plugins() {
    const dependencies = this._packageJson(this.appRoot).dependencies || {};
    const lock = this._lock();
    const plugins = {};

    Object.keys(dependencies)
      .sort()
      .forEach((name) => {
        const spec = dependencies[name];

        if (this._isLocal(spec)) {
          const local = this._local(name, spec);

          if (local) {
            plugins[name] = local;
          }

          return;
        }

        if (this._isNative(name, spec, lock)) {
          plugins[name] = this._version(name, spec, lock);
        }
      });

    return plugins;
  }

  // One line per plugin added, removed or changed between two recorded sets.
  changes(recorded, current) {
    return [...new Set([...Object.keys(recorded), ...Object.keys(current)])]
      .sort()
      .filter((name) => recorded[name] !== current[name])
      .map((name) => {
        if (!(name in recorded)) {
          return `  added    ${name} ${current[name]}`;
        }

        if (!(name in current)) {
          return `  removed  ${name} ${recorded[name]}`;
        }

        return `  changed  ${name} ${recorded[name]} -> ${current[name]}`;
      });
  }

  // A local plugin is its own source, found relative to the app root without an
  // install. Its version never moves when its native code does, so a hash of
  // that code is recorded with it. Null when it is not native.
  _local(name, spec) {
    const dir = path.resolve(this.appRoot, spec.slice('file:'.length));

    if (!fs.existsSync(path.join(dir, 'package.json'))) {
      this._fail([`${name} (${spec}) in ${this._appPackageJson()} has no package.json at ${dir}.`]);
    }

    const packageJson = this._packageJson(dir);

    return packageJson.capacitor || packageJson.cordova ? `${packageJson.version}+${this._hash(dir)}` : null;
  }

  // The runtimes are native by name, so they need no installed copy. Anything
  // else is native only if its own package.json says so — the one thing a
  // lockfile does not record — wherever in the workspace it is installed.
  _isNative(name, spec, lock) {
    if (RUNTIMES.includes(name)) {
      return true;
    }

    const dir = this._resolve(name);

    if (dir) {
      const packageJson = this._packageJson(dir);

      return !!(packageJson.capacitor || packageJson.cordova);
    }

    // Unresolved, there is no package.json to say. One that looks native is not
    // guessed at: recording without it would let a plugin change through unseen.
    if (!this._looksNative(name)) {
      return false;
    }

    // Added to package.json and never installed: the lockfile is the fix.
    if (lock && !this._lockVersion(lock, name)) {
      this._failUnpinned(name, spec);
    }

    this._fail([
      `${name} (${spec}) in ${this._appPackageJson()} is not installed, so whether it is native cannot be read.`,
      'Install the packages first.',
    ]);
  }

  // The lockfile's version when the app root has one; otherwise the installed one.
  _version(name, spec, lock) {
    if (lock) {
      const version = this._lockVersion(lock, name);

      if (!version) {
        this._failUnpinned(name, spec);
      }

      return version;
    }

    const dir = this._resolve(name);

    if (!dir) {
      this._fail([
        `${name} (${spec}) in ${this._appPackageJson()} is not installed, and ${this.appRoot} has no package-lock.json to pin it.`,
        'Install the packages first.',
      ]);
    }

    return this._packageJson(dir).version;
  }

  // The app root's package-lock.json, or null when it has none.
  _lock() {
    const file = path.join(this.appRoot, 'package-lock.json');

    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  }

  // Lockfile v2 and v3 list installs under packages by their node_modules path;
  // v1 has only the nested dependencies map.
  _lockVersion(lock, name) {
    const installed = (lock.packages || {})[`node_modules/${name}`] || (lock.dependencies || {})[name];

    return installed ? installed.version : null;
  }

  _failUnpinned(name, spec) {
    this._fail([
      `${name} (${spec}) is in ${this._appPackageJson()} but not in its package-lock.json.`,
      `Run npm install in ${this.appRoot} to update its package-lock.json.`,
    ]);
  }

  // Looked up the way Node looks it up — the app root's node_modules, then each
  // parent's — so a workspace that installs only above the app root still resolves.
  _resolve(name) {
    for (let dir = this.appRoot; ; dir = path.dirname(dir)) {
      const candidate = path.join(dir, 'node_modules', name);

      if (fs.existsSync(path.join(candidate, 'package.json'))) {
        return candidate;
      }

      if (path.dirname(dir) === dir) {
        return null;
      }
    }
  }

  _looksNative(name) {
    return /capacitor|cordova/i.test(name);
  }

  _isLocal(spec) {
    return String(spec).startsWith('file:');
  }

  // What a local plugin builds into the shells: its package.json, the podspec
  // CocoaPods reads from the plugin's root (its pods and iOS settings), and its
  // ios/ and android/ source. Paths are sorted and joined with forward slashes,
  // and CRLF is read as LF, so a Windows checkout and a Linux CI agent hash the
  // same tree to the same value.
  _hash(dir) {
    const hash = crypto.createHash('sha256');
    const podspecs = fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.podspec'))
      .map((entry) => entry.name);
    const files = ['package.json', ...podspecs, ...this._files(dir, 'ios'), ...this._files(dir, 'android')].sort();

    files.forEach((file) => {
      // latin1 maps every byte to one character and back, so a binary file
      // survives the line-ending rewrite unchanged apart from its CRLF pairs.
      const content = fs.readFileSync(path.join(dir, file)).toString('latin1').replace(/\r\n/g, '\n');

      hash.update(`${file}\0`);
      hash.update(content, 'latin1');
      hash.update('\0');
    });

    return hash.digest('hex').slice(0, 12);
  }

  // Every file under dir/relative, as a path from dir with forward slashes.
  _files(dir, relative) {
    const full = path.join(dir, relative);

    if (!fs.existsSync(full)) {
      return [];
    }

    return fs.readdirSync(full, { withFileTypes: true })
      .filter((entry) => !HASH_SKIP.includes(entry.name))
      .flatMap((entry) => {
        const child = `${relative}/${entry.name}`;

        if (entry.isDirectory()) {
          return this._files(dir, child);
        }

        return entry.isFile() ? [child] : [];
      });
  }

  _findAppRoot(dir) {
    for (; ; dir = path.dirname(dir)) {
      if (CAPACITOR_CONFIGS.some((file) => fs.existsSync(path.join(dir, file)))) {
        return dir;
      }

      if (path.dirname(dir) === dir) {
        return null;
      }
    }
  }

  // The deployment and environment managers refuse a bundle whose level is not
  // a whole number of 0 or more, so a build that would be refused there stops here.
  _read() {
    const native = JSON.parse(fs.readFileSync(this.file, 'utf8'));

    if (!Number.isInteger(native.level) || native.level < 0) {
      this._fail([`${this._relativeFile()} must hold {"level": N}, N a whole number of 0 or more.`]);
    }

    return native;
  }

  // Any other key native.json carries is kept where it is.
  _write(native, level, plugins) {
    fs.writeFileSync(this.file, `${JSON.stringify({ ...native, level, plugins }, null, 2)}\n`);
  }

  _appPackageJson() {
    return path.join(this.appRoot, 'package.json');
  }

  _packageJson(dir) {
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  }

  _relativeFile() {
    return path.relative(env.frontendDir(), this.file).split(path.sep).join('/');
  }

  _fail(lines) {
    console.error(lines.join('\n'));
    env.process().exit(1);
  }
}

module.exports = {
  NativeLevel,
};
