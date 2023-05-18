#!/usr/bin/env node

const env = require('./libs/env');
const { Serve } = require('./libs/serve');


const options = {
  configuration: env.getConfiguration(),
  port: env.getPort(),
  liveReload: env.getArg('live-reload','false'),
  secure: env.getArg('secure',false),
  native: env.getArg('native',false),
};

(new Serve(options)).run();
