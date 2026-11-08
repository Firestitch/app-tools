#!/usr/bin/env node

var env = require('./libs/env');
const { Build } = require('./libs/build');
const { NativeLevel } = require('./libs/native-level');


// Before anything is built: a Capacitor app whose native plugins moved without
// native.json's level stops here. See libs/native-level.js.
(new NativeLevel()).check();

(new Build(env.configuration('dev')))
  .build()
  .subscribe();
