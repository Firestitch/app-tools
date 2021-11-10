const { Builder } = require('./builder');
var cmd = require('./cmd');
const env = require('./env');


class Build extends Builder {

  run() {
    this.init()
    .then(() => {
      //var dist = env.getDistDir();
      //fs.rmSync(dist, { recursive: true, force: true });

      var cmd_ = 'cross-env NG_PERSISTENT_BUILD_CACHE=1 && node --max_old_space_size=8000 node_modules/@angular/cli/bin/ng';

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

      cmd.exec(cmd_, args, { cwd: '../' });
    });
  }
}

module.exports = {
  Build: Build,
};