#!/usr/bin/env node

var env = require('./libs/env');
const { Build } = require('./libs/build');


const options = {
  configuration: env.getConfiguration('dev'),
  native: env.getArg('native',false),
  postBuild: env.getArg('postBuild'),
  preBuild: env.getArg('preBuild'),
};

(new Build(options)).run();
