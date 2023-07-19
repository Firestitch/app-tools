var fs = require('fs');
var env = require('./env');
var cmd = require('./cmd');
var path = require('path');
var { Builder } = require('./builder');


class Build extends Builder {

  run() {
    return new Promise((resolve, reject) => {
      this.init()
      .then(() => {
        var dist = env.distDir();

        try {
          fs.rmSync(dist, { recursive: true, force: true });
        } catch(e) {}
        
        if(env.preBuild()) {
          const file = path.join(env.process().cwd(), env.preBuild());
          require(file);
        }        

        var isWin = env.process().platform === 'win32';
        var cmd_ = `${isWin ? 'set ' : ''}NG_PERSISTENT_BUILD_CACHE=1 && node --max_old_space_size=8000 node_modules/@angular/cli/bin/ng`;
        var args = [
          'build',
          `--progress=false`,
          `--outputPath=${env.outputDir()}`,
          `--output-hashing=all`,
          `--configuration=${this.configuration}`,
        ];
        
        if(env.project()) {
          args.push(`--project=${env.project()}`);
        }

        if(env.native()) {
          args = [
            ...args,
            `--optimization=false`,
            `--sourceMap=true`
          ];
        }

        var process = cmd.exec(cmd_, args);

        process.on('close', function (code) {
          if(env.postBuild()) {
            const file = path.join(env.process().cwd(), env.postBuild());
            require(file);
          }

          resolve();
        });
      });
    });
  }
}

module.exports = {
  Build,
};
