const path = require('path');
const { from, forkJoin, of, Observable } = require('rxjs');
const { switchMap, tap, map, mapTo } = require('rxjs/operators');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const env = require('./env');
const cmd = require('./cmd');
const { Build } = require('./build');
const { BuildJsonGenerator } = require('./build-json-generator');
const prompts = require('prompts');
const yazl = require('yazl');


class Package extends Build {

  _buildJsonGenerator = new BuildJsonGenerator();
  _zipFile = '';
  _zipName = '';
  _zipTmpFile = '';
  _archive;
  _processedFiles = 0;
  _startTime = null;
  _lastProgressUpdate = null;
  _totalFilesToAdd = 0;
  _currentFileBeingAdded = '';
  _nativeZipTool = null;

  package() {
    const project = env.project() ? `-${env.project()}` : '';
    const packageJson = env.packageJson();
    const previousVersion = packageJson.version;
    this._zipName = env.zipName() ? env.zipName() : `${packageJson.name}${project}-${env.configuration('production')}`;
    this._zipFile = `${path.join(env.instanceDir(), this._zipName)}.zip`;
    this._zipTmpFile = `${this._zipFile}.tmp`;
    this.generateEnv();

    this._nativeZipTool = this._detectNativeZip();

    return of(null)
      .pipe(
        tap(() => this.deleteZip()),
        switchMap(() => super.build(false)),
        switchMap(() => this.createZip()),
        switchMap(() => this.promptVersion()),
        switchMap(({ version }) => {
          return this.saveVersion(version)
            .pipe(
              mapTo(version),
            );
        }),
        switchMap((version) => {
          if (this._nativeZipTool) {
            // Native zip already wrote the file — just rename
            console.log(`\nFinalizing zip package...`);
            try {
              if (fs.existsSync(this._zipTmpFile)) {
                fs.renameSync(this._zipTmpFile, this._zipFile);
              }
              const finalStats = fs.statSync(this._zipFile);
              const finalSize = (finalStats.size / 1024 / 1024).toFixed(2);
              console.log(`✓ Package created successfully: ${this._zipName}.zip (${finalSize} MB)`);
            } catch (err) {
              console.error(`✗ Error finalizing: ${err.message}`);
              throw err;
            }
            return of(version);
          }

          // yazl fallback — finalize the archive
          console.log(`\nFinalizing zip package...`);
          console.log(`Files added to archive: ${this._processedFiles}`);
          console.log(`Starting compression and writing to disk...\n`);

          return this._finalizeYazlArchive(version);
        }),
        switchMap((version) => previousVersion !== version ?
          this.publish() : of(null)),
      );
  }

  _findExecutable(name) {
    // First check PATH
    try {
      const check = process.platform === 'win32' ? `where ${name}` : `which ${name}`;
      const result = execSync(check, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
      const found = result.trim().split(/\r?\n/)[0];
      if (found) return found;
    } catch (e) {}

    // On Windows, also search standard install directories via the registry / Program Files
    if (process.platform === 'win32') {
      const programDirs = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)'], process.env['ProgramW6432']].filter(Boolean);
      for (const dir of programDirs) {
        const candidate = path.join(dir, '7-Zip', '7z.exe');
        if (name === '7z' && fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }

    return null;
  }

  _detectNativeZip() {
    // Try 7z first (fastest, multithreaded) — works on both Windows and Linux
    const sevenZip = this._findExecutable('7z');
    if (sevenZip) {
      console.log(`Using native zip: 7z (${sevenZip})`);
      return { type: '7z', path: sevenZip };
    }

    // Try zip (standard on Linux, sometimes available on Windows via Git Bash etc.)
    const zip = this._findExecutable('zip');
    if (zip) {
      console.log(`Using native zip: zip (${zip})`);
      return { type: 'zip', path: zip };
    }

    console.log(`No native zip tool found, using yazl (slower)`);
    return null;
  }

  _nativeCreateZip(items) {
    const instanceDir = env.instanceDir();
    const startTime = Date.now();

    // Resolve which items actually exist
    const existingItems = items.filter((item) => {
      const fullPath = path.join(instanceDir, item);
      const parts = item.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart.startsWith('.') || lastPart === 'node_modules') return false;
      return fs.existsSync(fullPath);
    });

    if (existingItems.length === 0) {
      console.log(`No items to zip.`);
      return of(null);
    }

    console.log(`\nZipping ${existingItems.length} directories/files with ${this._nativeZipTool.type}...`);

    if (this._nativeZipTool.type === '7z') {
      return this._zipWith7z(existingItems, instanceDir, this._zipTmpFile, startTime);
    }

    if (this._nativeZipTool.type === 'zip') {
      return this._zipWithZip(existingItems, instanceDir, this._zipTmpFile, startTime);
    }

    return of(null);
  }

  _zipWith7z(items, cwd, outputFile, startTime) {
    return new Observable((observer) => {
      // Build exclusion list
      const excludes = [
        '-xr!node_modules',
        '-xr!.*',
        '-x!backend/dist',
      ];

      // 7z a -tzip output.zip items... -xr!excludes
      const args = [
        'a',
        '-tzip',
        '-mx=1',    // compression level 1 (fast)
        '-mmt=on',  // multithreaded
        outputFile,
        ...items,
        ...excludes,
      ];

      console.log(`Running: 7z a -tzip -mx=1 -mmt=on ${path.basename(outputFile)} ${items.join(' ')}`);

      const proc = spawn(this._nativeZipTool.path, args, {
        cwd: cwd,
        stdio: 'inherit',
        shell: false,
      });

      proc.on('close', (code) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (code !== 0) {
          console.error(`✗ 7-Zip exited with code ${code} after ${elapsed}s`);
          observer.error(new Error(`7-Zip failed with exit code ${code}`));
          return;
        }

        try {
          const stats = fs.statSync(outputFile);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`✓ Zip created: ${sizeMB} MB in ${elapsed}s`);
        } catch (e) {}

        observer.next(null);
        observer.complete();
      });

      proc.on('error', (err) => {
        console.error(`✗ Failed to run 7-Zip: ${err.message}`);
        observer.error(err);
      });
    });
  }

  _zipWithZip(items, cwd, outputFile, startTime) {
    return new Observable((observer) => {
      // zip -r -1 output.zip items... -x "*/node_modules/*" -x "*/.*" -x "backend/dist/*"
      const args = [
        '-r',
        '-1',       // compression level 1 (fast)
        outputFile,
        ...items,
        '-x', '*/node_modules/*',
        '-x', '*/.*',
        '-x', 'backend/dist/*',
      ];

      console.log(`Running: zip -r -1 ${path.basename(outputFile)} ${items.join(' ')}`);

      const proc = spawn(this._nativeZipTool.path, args, {
        cwd: cwd,
        stdio: 'inherit',
        shell: false,
      });

      proc.on('close', (code) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (code !== 0) {
          console.error(`✗ zip exited with code ${code} after ${elapsed}s`);
          observer.error(new Error(`zip failed with exit code ${code}`));
          return;
        }

        try {
          const stats = fs.statSync(outputFile);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`✓ Zip created: ${sizeMB} MB in ${elapsed}s`);
        } catch (e) {}

        observer.next(null);
        observer.complete();
      });

      proc.on('error', (err) => {
        console.error(`✗ Failed to run zip: ${err.message}`);
        observer.error(err);
      });
    });
  }

  _nativeAppendZip(items) {
    const instanceDir = env.instanceDir();
    const zipFile = fs.existsSync(this._zipTmpFile) ? this._zipTmpFile : this._zipFile;

    const existingItems = items.filter((item) => {
      const fullPath = path.join(instanceDir, item);
      return fs.existsSync(fullPath);
    });

    if (existingItems.length === 0) {
      return of(null);
    }

    if (this._nativeZipTool.type === '7z') {
      return new Observable((observer) => {
        const args = [
          'a',
          '-tzip',
          '-mx=1',
          zipFile,
          ...existingItems,
        ];

        const proc = spawn(this._nativeZipTool.path, args, {
          cwd: instanceDir,
          stdio: 'inherit',
          shell: false,
        });

        proc.on('close', (code) => {
          if (code !== 0) {
            observer.error(new Error(`7-Zip append failed with exit code ${code}`));
            return;
          }
          console.log(`✓ Appended ${existingItems.join(', ')} to zip`);
          observer.next(null);
          observer.complete();
        });

        proc.on('error', (err) => {
          observer.error(err);
        });
      });
    }

    // zip (Linux) — zip appends/updates by default when the archive exists
    if (this._nativeZipTool.type === 'zip') {
      return new Observable((observer) => {
        const args = [
          '-r',
          '-1',
          zipFile,
          ...existingItems,
        ];

        const proc = spawn(this._nativeZipTool.path, args, {
          cwd: instanceDir,
          stdio: 'inherit',
          shell: false,
        });

        proc.on('close', (code) => {
          if (code !== 0) {
            observer.error(new Error(`zip append failed with exit code ${code}`));
            return;
          }
          console.log(`✓ Appended ${existingItems.join(', ')} to zip`);
          observer.next(null);
          observer.complete();
        });

        proc.on('error', (err) => {
          observer.error(err);
        });
      });
    }

    return of(null);
  }

  _finalizeYazlArchive(version) {
    const finalizeStartTime = Date.now();
    let lastSize = 0;
    let lastUpdate = Date.now();
    let updateInterval;
    let stableCount = 0;

    const checkFileSize = () => {
      try {
        if (fs.existsSync(this._zipTmpFile)) {
          const stats = fs.statSync(this._zipTmpFile);
          const currentSize = stats.size;
          const sizeMB = (currentSize / 1024 / 1024).toFixed(2);
          const elapsed = ((Date.now() - finalizeStartTime) / 1000).toFixed(1);

          if (currentSize > lastSize) {
            process.stdout.write(`\rWriting: ${sizeMB} MB | Elapsed: ${elapsed}s | Compressing...    `);
            lastSize = currentSize;
            lastUpdate = Date.now();
            stableCount = 0;
          } else {
            stableCount++;
            if (stableCount > 4) {
              process.stdout.write(`\rWriting: ${sizeMB} MB | Elapsed: ${elapsed}s | Writing central directory...    `);
            }
          }
        }
      } catch (e) {}
    };

    return new Promise((resolve, reject) => {
      updateInterval = setInterval(checkFileSize, 1000);

      this._yazlOutput.on('close', () => {
        clearInterval(updateInterval);
        const totalElapsed = ((Date.now() - finalizeStartTime) / 1000).toFixed(1);

        try {
          if (fs.existsSync(this._zipTmpFile)) {
            const stats = fs.statSync(this._zipTmpFile);
            console.log(`\n✓ Compression complete: ${(stats.size / 1024 / 1024).toFixed(2)} MB written in ${totalElapsed}s`);
          }

          fs.renameSync(this._zipTmpFile, this._zipFile);
          const finalStats = fs.statSync(this._zipFile);
          console.log(`✓ Package created successfully: ${this._zipName}.zip (${(finalStats.size / 1024 / 1024).toFixed(2)} MB)`);
          resolve(version);
        } catch (err) {
          console.error(`✗ Error finalizing: ${err.message}`);
          reject(err);
        }
      });

      this._yazlOutput.on('error', (err) => {
        clearInterval(updateInterval);
        reject(err);
      });

      this._archive.end();
    });
  }

  promptVersion() {
    console.log(`\n`);

    return this._buildJsonGenerator.promptVersion();
  }

  saveVersion(version) {
    this._buildJsonGenerator.saveBuildJson(version);
    this._buildJsonGenerator.savePackageJson(version);

    const items = [
      'frontend/dist/assets/build.json'
    ];

    return this.appendZip(items);
  }

  publish() {
    const unstaged = cmd.exec(`cd ${env.instanceDir()} && git diff --name-only`, [], { capture: true });
    const staged = cmd.exec(`cd ${env.instanceDir()} && git diff --name-only --staged`, [], { capture: true });
    const untracked = cmd.exec(`cd ${env.instanceDir()} && git ls-files --other --exclude-standard`, [], { capture: true });

    return forkJoin({
      unstaged,
      staged,
      untracked
    })
      .pipe(
        switchMap(({ unstaged, staged, untracked }) => {
          return (unstaged ? cmd.exec(`cd ${env.instanceDir()} && git add .`) : of(true))
            .pipe(
              map(() => ({ unstaged, staged, untracked })),
            );
        }),
        switchMap(({ unstaged, staged, untracked }) => {
          if (unstaged || untracked) {
            return from(
              prompts([
                {
                  type: 'text',
                  name: 'message',
                  message: 'There are files that have not been committed.\n\nPlease provide a commit message.',
                  initial: this._buildJsonGenerator.version,
                }
              ])
            )
              .pipe(
                switchMap((response) => {
                  return cmd.exec(`cd ${env.instanceDir()} && git commit --message="${response.message.replace('"', '\\"')}"`);
                }),
                switchMap(() => this.push()),
                switchMap(() => this.createTag()),
              );
          }

          if (staged) {
            return push()
              .pipe(
                switchMap(() => this.createTag())
              );
          }

          return of(true);
        })
      );
  }

  appendZip(items) {
    // Use native tool if available
    if (this._nativeZipTool) {
      return this._nativeAppendZip(items);
    }

    // yazl fallback
    console.log(`\nAppending zip package...\n`);

    this._processedFiles = 0;
    this._startTime = Date.now();
    this._lastProgressUpdate = Date.now();
    this._totalFilesToAdd = 0;

    console.log(`Counting files to add...`);
    items.forEach((item) => {
      const file = path.join(env.instanceDir(), item);
      const parts = item.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart.startsWith('.') || lastPart === 'node_modules') return;
      try {
        const stats = fs.statSync(file);
        if (stats.isDirectory()) {
          this._totalFilesToAdd += this._quickCountFiles(file);
        } else if (stats.isFile()) {
          this._totalFilesToAdd++;
        }
      } catch (e) {}
    });
    console.log(`Found ${this._totalFilesToAdd} files to add\n`);

    items.forEach((item) => {
      console.log(`Adding ${item}...`);
      const file = path.join(env.instanceDir(), item);
      const parts = item.split('/');
      const lastPart = parts[parts.length - 1];

      if (lastPart.startsWith('.') || lastPart === 'node_modules') {
        console.log(`Skipping ${item} (ignored)`);
        return;
      }

      try {
        const stats = fs.statSync(file);

        if (stats.isDirectory()) {
          this._addDirectoryRecursive(file, parts.join('/'));
        } else if (stats.isFile()) {
          this._currentFileBeingAdded = item;
          this._archive.addFile(file, parts.join('/'), { compressionLevel: 1 });
          this._updateProgress();
        }
      } catch (e) {
        console.log(`Warning: Could not add ${item}: ${e.message}`);
      }
    });

    if (this._processedFiles > 0) {
      const totalElapsed = ((Date.now() - this._startTime) / 1000).toFixed(1);
      const avgRate = (this._processedFiles / (totalElapsed / 60)).toFixed(0);
      console.log(`\n✓ All ${this._processedFiles} files added to archive queue in ${totalElapsed}s (avg ${avgRate} files/min)`);
    }

    return of(null);
  }

  _quickCountFiles(dirPath) {
    let count = 0;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      entries.forEach(entry => {
        const entryName = entry.name;
        if (entryName.startsWith('.') || entryName === 'node_modules') {
          return;
        }
        const fullPath = path.join(dirPath, entryName);
        if (entry.isDirectory()) {
          count += this._quickCountFiles(fullPath);
        } else if (entry.isFile()) {
          count++;
        }
      });
    } catch (e) {}
    return count;
  }

  _updateProgress() {
    this._processedFiles++;

    const now = Date.now();
    if (this._processedFiles % 10 === 0 || (now - this._lastProgressUpdate) > 500) {
      const elapsed = ((now - this._startTime) / 1000).toFixed(1);
      const rate = this._processedFiles / (elapsed / 60);
      const remaining = this._totalFilesToAdd - this._processedFiles;
      const percent = this._totalFilesToAdd > 0 ? ((this._processedFiles / this._totalFilesToAdd) * 100).toFixed(1) : '0';

      process.stdout.write(`\rProgress: ${percent}% (${this._processedFiles}/${this._totalFilesToAdd} files, ${remaining} remaining) | Elapsed: ${elapsed}s | Rate: ${rate.toFixed(0)} files/min    `);
      this._lastProgressUpdate = now;
    }
  }

  _addDirectoryRecursive(dirPath, zipPrefix) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      entries.forEach(entry => {
        const entryName = entry.name;

        if (entryName.startsWith('.') || entryName === 'node_modules') {
          return;
        }

        if (entryName === 'dist' && zipPrefix && zipPrefix.includes('backend')) {
          return;
        }

        const fullPath = path.join(dirPath, entryName);
        const zipPath = zipPrefix ? `${zipPrefix}/${entryName}` : entryName;

        if (entry.isDirectory()) {
          this._addDirectoryRecursive(fullPath, zipPath);
        } else if (entry.isFile()) {
          this._archive.addFile(fullPath, zipPath, { compressionLevel: 1 });
          this._updateProgress();
        }
      });
    } catch (e) {
      console.log(`Warning: Could not read directory ${dirPath}: ${e.message}`);
    }
  }

  createZip() {
    const includes = env.arg('includes') ? env.arg('includes').split(',') : [];
    const items = [
      'frontend/dist',
      'backend',
      'framework',
      'maintenance',
      ...includes,
    ];

    // For native zip, go straight to native tool
    if (this._nativeZipTool) {
      return this._nativeCreateZip(items)
        .pipe(
          tap(() => {
            console.log(`Created Package ${this._zipName}.zip`);
          }),
        );
    }

    // yazl fallback — set up the archive streams
    const output = fs.createWriteStream(this._zipTmpFile);
    this._archive = new yazl.ZipFile();
    this._archive.outputStream.pipe(output);
    this._yazlOutput = output;

    return of(null)
      .pipe(
        switchMap(() => this.appendZip(items)),
        tap(() => {
          console.log(`Created Package ${this._zipName}.zip`);
        }),
      );
  }

  createTag() {
    return cmd.exec(`cd ${env.instanceDir()} && git tag v${this._buildJsonGenerator.version} && git push origin --tags`);
  }

  push() {
    return cmd.exec(`cd ${env.instanceDir()} && git push`);
  }

  deleteZip() {
    try {
      fs.rmSync(this._zipFile, { force: true });
    } catch (e) {
    }

    try {
      fs.rmSync(this._zipTmpFile, { force: true });
    } catch (e) {
    }
  }
}

module.exports = {
  Package: Package,
};
