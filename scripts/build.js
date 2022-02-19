#!/usr/bin/env node

var env = require('./libs/env');
const { Build } = require('./libs/build');


const options = {
  configuration: env.getConfiguration('dev'),
  platform: env.getArg('platform','web'),
};

(new Build(options)).run();
