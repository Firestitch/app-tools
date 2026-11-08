#!/usr/bin/env node

var env = require('./libs/env');
const { Package } = require('./libs/package');
const { NativeLevel } = require('./libs/native-level');


// Before the version is asked for or anything is built: a Capacitor app whose
// native plugins moved without native.json's level stops here. See
// libs/native-level.js.
(new NativeLevel()).check();

(new Package(env.configuration('production')))
  .package()
  .subscribe();
