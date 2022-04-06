#!/usr/bin/env node

var env = require('./libs/env');
const { Package } = require('./libs/package');

const options = {
  configuration: env.getConfiguration('production'),
  platform: env.getPlatform(),
  postBuild: env.getArg('postBuild'),
  preBuild: env.getArg('preBuild'),
};

(new Package(options)).run();
