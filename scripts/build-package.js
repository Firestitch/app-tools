#!/usr/bin/env node

const build = require('./build-json');
const prompts = require('prompts');

(async () => {

  let version = process.env.npm_package_config_version;

  if (!version) {

    const response = await prompts({
      type: 'text',
      name: 'version',
      message: 'Please enter the version number?',
    });

    version = response.version;
  }

  build.save(version);
})();
