#!/usr/bin/env node

var env = require('./libs/env');
const { Build } = require('./libs/build');


(new Build(env.configuration('dev'))).run();
