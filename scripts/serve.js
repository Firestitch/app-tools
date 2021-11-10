#!/usr/bin/env node

const env = require('./libs/env');
const { Serve } = require('./libs/serve');


const options = {
  env: env.getEnv(),
  port: env.getPort(),
  liveReload: env.getArg('live-reload','false'),
  secure: env.getArg('secure',false),
};

(new Serve(options)).run();
