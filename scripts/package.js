#!/usr/bin/env node

var env = require('./libs/env');
const { Package } = require('./libs/package');

const options = {
  env: env.getArg('env', 'production'),
};

(new Package(options)).run();
