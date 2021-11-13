var fs = require('fs');
var env = require('./env');
var cmd = require('./cmd');
var { Builder } = require('./builder');


class Build extends Builder {

  run() {
    return new Promise((resolve, reject) => {
      this.init()
      .then(() => {
        var dist = env.getDistDir();

        try {
          fs.rmSync(dist, { recursive: true, force: true });
        } catch(e) {}
        
        var isWin = env.getProcess().platform === 'win32';

        var cmd_ = `${isWin ? 'set ' : ''}NG_PERSISTENT_BUILD_CACHE=1 && node --max_old_space_size=8000 node_modules/@angular/cli/bin/ng`;

        var args = [
          'build',
          `--progress=false`,
          `--outputPath=dist`,
          `--configuration=${this.options.env}`,
        ];

        if(env.isPlatformApp()) {
          args = [
            ...args,
            `--optimization=false`,
            `--sourceMap=true`
          ];
        }

        var process = cmd.exec(cmd_, args, { cwd: '../' });

        process.on('close', function (code) {
          if(code) {
            env.getProcess().exit(1);
          }
          
          resolve();
        });
      });
    });
  }
}

module.exports = {
  Build: Build,
};
