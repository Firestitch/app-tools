const fs = require('fs');
const env = require('./env');
const cmd = require('./cmd');
const path = require('path');
const { Builder } = require('./builder');
const { tap } = require('rxjs/operators');


class Build extends Builder {

  build(generateBuildJson = true) {
    this.generateEnv();
    var dist = env.distDir();

    try {
      fs.rmSync(dist, { recursive: true, force: true });
    } catch (e) { }

    if (env.preBuild()) {
      const file = path.join(env.process().cwd(), env.preBuild());
      require(file);
    }

    var isWin = env.process().platform === 'win32';
    var cmd_ = `${isWin ? 'set ' : ''}NG_PERSISTENT_BUILD_CACHE=1 && node --max_old_space_size=8000 node_modules/@angular/cli/bin/ng`;
    var args = [
      'build',
      `--progress=true`,
      `--output-hashing=${env.outputHashing()}`,
      `--output-path=${env.outputDir()}`,
      `--configuration=${this.configuration}`,
    ];

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

  return cmd.exec(cmd_, args)
      .pipe(
        tap(() => {
          if(generateBuildJson) {
            this.generateBuildJson();
          }
          
          if (env.postBuild()) {
            const file = path.join(env.process().cwd(), env.postBuild());
            require(file);
          }
        }),
      );
  }
}

module.exports = {
  Build,
};
