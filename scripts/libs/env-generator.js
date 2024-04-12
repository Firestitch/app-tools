#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var env_ = require('./env');

class EnvGenerator {
  configuration = null;
  platform = null;

  constructor(configuration, platform) { 
    this.configuration = configuration;
    this.platform = platform;
  }    

  save() {
    var data = `export const env = { configuration: '${this.configuration}', platform: '${this.platform}' };`;

    fs.writeFileSync(path.join(env_.srcDir(), 'environments/env.ts'), data);
  }
}


module.exports = {
  EnvGenerator: EnvGenerator
}