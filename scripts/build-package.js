#!/usr/bin/env node

var build = require('./build-json');
var prompts = require('prompts');
var path = require('path');
var fs = require('fs');
var packageFile = path.join(__dirname, '../../package.json');

(async () => {

  var packageJson = require(packageFile);

  var version = process.env.npm_package_config_version;

  if (!version && !packageJson.version) {

    var response = await prompts({
      type: 'text',
      name: 'version',
      message: 'Please enter the version number?',
      initial: packageJson.version,
    });

    version = response.version;
    packageJson.version = version;

    fs.writeFileSync(packageFile, JSON.stringify(packageJson,null,2));    
  }
  
  build.save();
})();
