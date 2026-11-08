#!/usr/bin/env node

const { NativeLevel } = require('./libs/native-level');


// Raises the project's native.json level by one and records its native plugins.
// Run it whenever `build` or `package` refuses a Capacitor app for changed plugins.
(new NativeLevel()).raise();
