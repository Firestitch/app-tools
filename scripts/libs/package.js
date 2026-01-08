const path = require('path');
const { from, forkJoin, of, Observable } = require('rxjs');
const { switchMap, tap, map, mapTo } = require('rxjs/operators');
const fs = require('fs');
const env = require('./env');
const cmd = require('./cmd');
const { Build } = require('./build');
const { BuildJsonGenerator } = require('./build-json-generator');
const prompts = require('prompts');
let yazl;
try {
  yazl = require('yazl');
} catch (e) {
  // Fallback: try to resolve from parent node_modules
  const possiblePaths = [
    path.join(__dirname, '../../../../yazl'),
    path.join(__dirname, '../../../../../yazl'),
    path.join(__dirname, '../../../../../../yazl'),
  ];
  
  for (const yazlPath of possiblePaths) {
    if (fs.existsSync(yazlPath)) {
      yazl = require(yazlPath);
      break;
    }
  }
  
  if (!yazl) {
    throw new Error('yazl module not found. Please install it in the frontend directory: npm install yazl --save-dev');
  }
}


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

  package() {
    const project = env.project() ? `-${env.project()}` : '';
    const packageJson = env.packageJson();
    const previousVersion = packageJson.version;
    this._zipName = env.zipName() ? env.zipName() : `${packageJson.name}${project}-${env.configuration('production')}`;
    this._zipFile = `${path.join(env.instanceDir(), this._zipName)}.zip`;
    this._zipTmpFile = `${this._zipFile}.tmp`;
    this.generateEnv();

    const output = fs.createWriteStream(this._zipTmpFile);
    this._archive = new yazl.ZipFile();
    this._archive.outputStream.pipe(output);


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
          console.log(`\nFinalizing zip package...`);
          console.log(`Files added to archive: ${this._processedFiles}`);
          console.log(`Starting compression and writing to disk...\n`);
          
          const finalizeStartTime = Date.now();
          let lastSize = 0;
          let lastUpdate = Date.now();
          let updateInterval;
          
          // Monitor file size growth with more detail
          let lastStableSize = 0;
          let stableCount = 0;
          const checkFileSize = () => {
            try {
              if (fs.existsSync(this._zipTmpFile)) {
                const stats = fs.statSync(this._zipTmpFile);
                const currentSize = stats.size;
                const sizeMB = (currentSize / 1024 / 1024).toFixed(2);
                const elapsed = ((Date.now() - finalizeStartTime) / 1000).toFixed(1);
                
                if (currentSize > lastSize) {
                  const bytesPerSec = (currentSize - lastSize) / ((Date.now() - lastUpdate) / 1000);
                  const rateMB = (bytesPerSec / 1024 / 1024) * 60;
                  const percentComplete = lastSize > 0 ? ((currentSize / (lastSize * 1.1)) * 100).toFixed(1) : '0';
                  
                  // Estimate progress based on file count vs size
                  const estimatedProgress = Math.min(95, (currentSize / 100000000) * 100).toFixed(1); // Rough estimate
                  
                  process.stdout.write(`\rWriting: ${sizeMB} MB (~${estimatedProgress}%) | Elapsed: ${elapsed}s | Rate: ${rateMB.toFixed(1)} MB/min    `);
                  lastSize = currentSize;
                  lastUpdate = Date.now();
                  stableCount = 0;
                } else {
                  stableCount++;
                  if (stableCount > 2) {
                    // Size hasn't changed - likely writing central directory (slow part)
                    process.stdout.write(`\rWriting: ${sizeMB} MB | Elapsed: ${elapsed}s | Writing central directory (this can take a while with many files)...    `);
                  } else {
                    process.stdout.write(`\rWriting: ${sizeMB} MB | Elapsed: ${elapsed}s | Compressing...    `);
                  }
                }
                
                // Detect if we're stuck (size hasn't changed for a while)
                if (currentSize === lastStableSize) {
                  stableCount++;
                } else {
                  lastStableSize = currentSize;
                  stableCount = 0;
                }
              }
            } catch (e) {
              // File might not exist yet or be locked
            }
          };
          
          return new Promise((resolve, reject) => {
            // Start monitoring file size
            updateInterval = setInterval(checkFileSize, 500);
            
            output.on('close', () => {
              clearInterval(updateInterval);
              const totalElapsed = ((Date.now() - finalizeStartTime) / 1000).toFixed(1);
              
              // Get final file size
              let finalSizeMB = '0';
              try {
                if (fs.existsSync(this._zipTmpFile)) {
                  const stats = fs.statSync(this._zipTmpFile);
                  finalSizeMB = (stats.size / 1024 / 1024).toFixed(2);
                }
              } catch (e) {}
              
              console.log(`\n✓ Compression complete: ${finalSizeMB} MB written in ${totalElapsed}s`);
              console.log(`Renaming ${this._zipTmpFile} to ${this._zipFile}...`);
              
              try {
                fs.renameSync(this._zipTmpFile, this._zipFile);
                const finalStats = fs.statSync(this._zipFile);
                const finalSize = (finalStats.size / 1024 / 1024).toFixed(2);
                console.log(`✓ Package created successfully: ${this._zipName}.zip (${finalSize} MB)`);
                resolve(version);
              } catch (renameErr) {
                console.error(`\n✗ Error renaming file: ${renameErr.message}`);
                reject(renameErr);
              }
            });
            
            output.on('error', (err) => {
              clearInterval(updateInterval);
              console.error(`\n✗ Error writing zip file: ${err.message}`);
              reject(err);
            });
            
            this._archive.outputStream.on('error', (err) => {
              clearInterval(updateInterval);
              console.error(`\n✗ Error in archive stream: ${err.message}`);
              reject(err);
            });
            
            this._archive.on('error', (err) => {
              clearInterval(updateInterval);
              console.error(`\n✗ Error in archive: ${err.message}`);
              reject(err);
            });
            
            console.log(`Calling archive.end() to start finalization...`);
            this._archive.end();
            console.log(`Archive.end() called. Stream is processing and writing data...`);
          });
        }),
        switchMap((version) => previousVersion !== version ? 
          this.publish() : of(null)),
      );
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
    console.log(`\nAppending zip package...\n`);
    
    // Start progress tracking
    this._processedFiles = 0;
    this._startTime = Date.now();
    this._lastProgressUpdate = Date.now();
    this._totalFilesToAdd = 0;
    
    // Quick count first (just for display, won't slow down much)
    console.log(`Counting files to add...`);
    items.forEach((item) => {
      const file = path.join(env.instanceDir(), item);
      const parts = item.split('/');
      const lastPart = parts[parts.length - 1];
      // Skip items that start with . or are node_modules
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
    
    // Now add files
    items.forEach((item) => {
      console.log(`Adding ${item}...`);
      const file = path.join(env.instanceDir(), item);
      const parts = item.split('/');
      const lastPart = parts[parts.length - 1];
      
      // Skip items that start with . or are node_modules
      if (lastPart.startsWith('.') || lastPart === 'node_modules') {
        console.log(`Skipping ${item} (ignored)`);
        return;
      }

      try {
        const stats = fs.statSync(file);
        
        if (stats.isDirectory()) {
          // Recursively add directory files, excluding common slow directories
          this._addDirectoryRecursive(file, parts.join('/'));
        } else if (stats.isFile()) {
          this._currentFileBeingAdded = item;
          this._archive.addFile(file, parts.join('/'));
          this._updateProgress();
        }
      } catch (e) {
        console.log(`Warning: Could not add ${item}: ${e.message}`);
      }
    });

    // Show final summary
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
        // Skip files and folders that start with . and node_modules
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
    
    // Update progress every 10 files or every 500ms to avoid console spam
    const now = Date.now();
    if (this._processedFiles % 10 === 0 || (now - this._lastProgressUpdate) > 500) {
      const elapsed = ((now - this._startTime) / 1000).toFixed(1);
      const rate = this._processedFiles / (elapsed / 60); // files per minute
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
        
        // Skip files and folders that start with . and node_modules
        if (entryName.startsWith('.') || entryName === 'node_modules') {
          return;
        }
        
        // Special case: skip backend/dist directory
        if (entryName === 'dist' && zipPrefix && zipPrefix.includes('backend')) {
          return;
        }
        
        const fullPath = path.join(dirPath, entryName);
        const zipPath = zipPrefix ? `${zipPrefix}/${entryName}` : entryName;
        
        if (entry.isDirectory()) {
          this._addDirectoryRecursive(fullPath, zipPath);
        } else if (entry.isFile()) {
          this._archive.addFile(fullPath, zipPath);
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
