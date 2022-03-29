const path = require('path');
const zip = require('bestzip');
const fs = require('fs');
const env = require('./env');
const { Build } = require('./build');


class Package extends Build {

  run() {
    return new Promise((resolve, reject) => {
      this.buildJsonGenerator.promptVersion()
      .then(() => {
        this.init()
        .then(() => {

          var packageJson = env.getPackageJson();
          var zipFileName = `${packageJson.name}.zip`;
          var zipFile = path.join(env.getInstanceDir(), zipFileName);
          var includes = env.getArg('include') ? env.getArg('include').split(',') : [];

          try {
            fs.rmSync(zipFile, { force: true });
          } catch(e) {}

          super.run()
          .then(() => {
            zip({
              source: [
                'frontend/dist',
                'backend',
                'framework',
                'maintenance',
                ...includes,
              ],
              destination: zipFile,
              cwd: env.getInstanceDir(),
            }).then(function() {
              console.log(`Created Package ${zipFile}`);
              resolve();
            }).catch(function(err) {
              console.error(err.stack);
              process.exit(1);
            });
          });
        });
      });
    });
  }
}

module.exports = {
  Package: Package,
};
