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
        var dist = env.getDistDir();
        var options = this.options;

        try {
          fs.rmSync(dist, { recursive: true, force: true });
        } catch(e) {}
        
        if(options.preBuild) {
          const file = path.join(env.getProcess().cwd(), options.preBuild);
          require(file);
        }        

        var isWin = env.getProcess().platform === 'win32';
        var cmd_ = `${isWin ? 'set ' : ''}NG_PERSISTENT_BUILD_CACHE=1 && node --max_old_space_size=8000 node_modules/@angular/cli/bin/ng`;
        var args = [
          'build',
          `--progress=false`,
          `--outputPath=dist`,
          `--configuration=${options.configuration}`,
        ];

        if(env.isPlatformApp()) {
          args = [
            ...args,
            `--optimization=false`,
            `--sourceMap=true`
          ];
        }

        var process = cmd.exec(cmd_, args);

        process.on('close', function (code) {
          if(options.postBuild) {
            const file = path.join(env.getProcess().cwd(), options.postBuild);
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
