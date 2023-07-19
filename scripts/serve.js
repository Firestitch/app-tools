#!/usr/bin/env node

const env = require('./libs/env');
const { Serve } = require('./libs/serve');


const options = {
  configuration: env.configuration(),
  port: env.port(),
  liveReload: env.arg('live-reload','false'),
  secure: env.arg('secure',false),
  native: env.arg('native',false),
};

(new Serve(options)).run();
