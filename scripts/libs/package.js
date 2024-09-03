const path = require('path');
const { from, forkJoin, of, Observable } = require('rxjs');
const { switchMap, tap, map } = require('rxjs/operators');
const fs = require('fs');
const env = require('./env');
const cmd = require('./cmd');
const { Build } = require('./build');
const { BuildJsonGenerator } = require('./build-json-generator');
const prompts = require('prompts');
const archiver = require('archiver');


class Package extends Build {

  _buildJsonGenerator = new BuildJsonGenerator();
  _zipFile = '';
  _zipName = '';
  _archive;

  package() {
    const project = env.project() ? `-${env.project()}` : '';
    const packageJson = env.packageJson();
    const previousVersion = packageJson.version;
    this._zipName = env.zipName() ? env.zipName() : `${packageJson.name}${project}`;
    this._zipFile = `${path.join(env.instanceDir(), this._zipName)}.zip`;
    this._zipTmpFile = `${this._zipFile}.tmp`;
    this.generateEnv();

    const output = fs.createWriteStream(this._zipTmpFile);
    this._archive = archiver('zip', {
      zlib: { level: 9 } 
    });

    this._archive.pipe(output);


    return of(null)
      .pipe(
        tap(() => this.deleteZip()),
        switchMap(() => super.build()),
        switchMap(() => this.createZip()),
        switchMap(() => this.promptVersion()),
        switchMap(({ version }) => {
          return this.saveVersion(version)
            .pipe(
              switchMap(() => previousVersion !== version ? 
                this.publish()
                : of(null)),
            )
        }),
        tap(() => {
          this._archive.finalize();
        })
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
      //'frontend/dist/assets/build.json'
    ];

    return this.appendZip(items)
    .pipe(
      tap(() => {
        fs.renameSync(this._zipTmpFile, this._zipFile);
      }),
    );
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
    console.log(`\nZipping package...`);
    items
      .forEach((item) => {
        console.log(`Adding ${item}...`);
        const file = path.join(env.instanceDir(), item);
        const stats = fs.statSync(file);
        const parts = item.split('/');

        if (stats.isDirectory()) {
          this._archive.directory(file, parts.join('/'));
        } else if (stats.isFile()) {
          this._archive.file(file, { name: parts.join('/') });
        }
      });

    return of(null);
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
    } catch (e) { }
  }
}

module.exports = {
  Package: Package,
};
