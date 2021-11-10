const path = require('path');
const zip = require('bestzip');
const fs = require('fs');
const env = require('./env');
const { Build } = require('./build');


class Package extends Build {

  init() {
    this.generateEnv();
    return this.buildJsonGenerator.promptVersion();
  }

  run() {
    var packageJson = env.getPackageJson();
    var zipFileName = `${packageJson.name}.zip`;
    var zipFile = path.join(env.getInstanceDir(), zipFileName);

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
          'maintenance'
        ],
        destination: zipFile,
        cwd: env.getInstanceDir(),
      }).then(function() {
        console.log(`Created Package ${zipFile}`);
      }).catch(function(err) {
        console.error(err.stack);
        process.exit(1);
      });
    });
  }

}

module.exports = {
  Package: Package,
};
