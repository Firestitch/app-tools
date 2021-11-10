#!/usr/bin/env node

var env = require('./libs/env');
const { Build } = require('./libs/build');

const options = {
  env: env.getEnv('production'),
};

(new Build(options)).run();
