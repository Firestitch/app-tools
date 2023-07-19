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
          var project = env.project() ? `-${env.project()}` : '';
          var packageJson = env.packageJson();
          var zipFileName = `${packageJson.name}${project}.zip`;
          var zipFile = path.join(env.instanceDir(), zipFileName);
          var includes = env.arg('includes') ? env.arg('includes').split(',') : [];

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
              cwd: env.instanceDir(),
            })
              .then(function() {
                console.log(`Created Package ${zipFile}`);
                resolve();
              })
              .catch(function(err) {
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
