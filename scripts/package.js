#!/usr/bin/env node

var env = require('./libs/env');
const { Package } = require('./libs/package');

const options = {
  configuration: env.getConfiguration('production'),
};

(new Package(options)).run();
