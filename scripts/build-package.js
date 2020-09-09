#!/usr/bin/env node

const build = require('./build-json');
const prompts = require('prompts');
const path = require('path');
const fs = require('fs');
const packageFile = path.join(__dirname, '../../package.json');

(async () => {

  const packageJson = require(packageFile);

  let version = process.env.npm_package_config_version;

  if (!version) {

    const response = await prompts({
      type: 'text',
      name: 'version',
      message: 'Please enter the version number?',
      initial: packageJson.version,
    });

    version = response.version;
  }

  packageJson.version = version;

  fs.writeFileSync(packageFile, JSON.stringify(packageJson,null,2));

  build.save();
})();
