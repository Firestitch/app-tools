const { Build } = require('./build');
var cmd = require('./cmd');
const env = require('./env');


class Package extends Build {

  init() {
    this.generateEnv();
    return this.buildJsonGenerator.promptVersion();
  }
  
}

module.exports = {
  Package: Package,
};