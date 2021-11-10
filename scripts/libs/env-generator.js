#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var env_ = require('./env');


class EnvGenerator {
  env = null;
  platform = null;

  constructor(env, platform) { 
    this.env = env;
    this.platform = platform;
  }    

  save() {
    var data = JSON.stringify({
      env: this.env,
      platform: this.platform,
    });

    var code = `export const env = ${data}`;

    fs.writeFileSync(path.join(env_.getFrontendDir(), 'src/environments/env.ts'), code);
  }
}


module.exports = {
  EnvGenerator: EnvGenerator
}