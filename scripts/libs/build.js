const fs = require('fs');
const env = require('./env');
const cmd = require('./cmd');
const { Builder } = require('./builder');
const { of } = require('rxjs');
const { switchMap, tap } = require('rxjs/operators');


class Build extends Builder {

  // runPostBuild = false lets `package` own when postBuild fires: it runs the hook
  // itself, after the version is written, so a hook can act on the new version.
  build(generateBuildJson = true, runPostBuild = true) {
    this.generateEnv();
    var dist = env.distDir();

    try {
      fs.rmSync(dist, { recursive: true, force: true });
    } catch (e) { }

    var isWin = env.process().platform === 'win32';
    var cmd_ = `${isWin ? 'set ' : ''}NG_PERSISTENT_BUILD_CACHE=1 && node --max_old_space_size=8000 node_modules/@angular/cli/bin/ng`;
    var args = [
      'build',
      `--progress=true`,
      `--output-hashing=${env.outputHashing()}`,
      `--configuration=${this.configuration}`,
    ];

    if (env.outputDir()) {
      args.push(`--output-path=${env.outputDir()}`);
    }

    if (env.project()) {
      args.push(`--project=${env.project()}`);
    }

    if (!env.platformWeb()) {
      args = [
        ...args,
        `--optimization=false`,
        `--source-map=true`
      ];
    }

    // preBuild runs through the same pipeline as the build itself so a shell hook
    // is awaited — and can abort the run — rather than being fired and forgotten.
    return cmd.hook(env.preBuild())
      .pipe(
        switchMap(() => cmd.exec(cmd_, args)),
        tap(() => {
          if(generateBuildJson) {
            this.generateBuildJson();
          }
        }),
        switchMap(() => runPostBuild ? cmd.hook(env.postBuild()) : of(null)),
      );
  }
}

module.exports = {
  Build,
};
