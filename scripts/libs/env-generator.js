#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var env_ = require('./env');

class EnvGenerator {
  configuration = null;
  native = null;

  constructor(configuration, native) { 
    this.configuration = configuration;
    this.native = native;
  }    

  save() {
    var data = `export const env = { configuration: '${this.configuration}', native: ${this.native ? 'true' : 'false'} };`;

    fs.writeFileSync(path.join(env_.srcDir(), 'environments/env.ts'), data);
  }
}


module.exports = {
  EnvGenerator: EnvGenerator
}