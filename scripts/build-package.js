#!/usr/bin/env node

const build = require('./build-json');
const prompts = require('prompts');

(async () => {
  const response = await prompts({
    type: 'text',
    name: 'version',
    message: 'Please enter the version number?',
  });

  build.save(response.version);
})();