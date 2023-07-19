#!/usr/bin/env node

const env = require('./libs/env');
const { Serve } = require('./libs/serve');


(new Serve(env.configuration())).run();
