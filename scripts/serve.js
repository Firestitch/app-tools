#!/usr/bin/env node

var env = require('./libs/env');
var { Serve } = require('./libs/serve');

const options = {
  env: env.getEnv(),
  port: env.getPort(),
  liveReload: env.getArg('live-reload','false'),
  secure: env.getArg('secure',false),
};

(new Serve(options)).run();
