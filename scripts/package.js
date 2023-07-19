#!/usr/bin/env node

var env = require('./libs/env');
const { Package } = require('./libs/package');


(new Package(env.configuration('production'))).run();
