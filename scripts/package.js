#!/usr/bin/env node

var env = require('./libs/env');
const { Package } = require('./libs/package');

const options = {
  configuration: env.getConfiguration('production'),
  platform: env.getPlatform(),
};

(new Package(options)).run();
