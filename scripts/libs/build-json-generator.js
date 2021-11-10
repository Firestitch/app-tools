#!/usr/bin/env node

var fs = require('fs');
var prompts = require('prompts');
var env = require('./env');


class BuildJsonGenerator {
  version = null;
  name = null;
  packageJson  = null;

  constructor() { 
    this.packageJson = env.getPackageJson();
    this.version = this.packageJson.version;
    this.name = this.packageJson.name;
  }  

  async promptVersion() {
    var response = await prompts({
      type: 'text',
      name: 'version',
      message: 'Please enter the version number?',
      initial: this.version,
    });

    console.log('');

    this.version = response.version;   

    this.packageJson.version = this.version;    
    fs.writeFileSync(env.getPackageJsonFile(), JSON.stringify(this.packageJson,null,2));
  }

  save() {
    var data = JSON.stringify({
      name: this.name,
      version: this.version,
      date: new Date().toISOString(),
    });

    fs.writeFileSync(env.getBuildJsonFile(), data);
  }
}


module.exports = {
  BuildJsonGenerator: BuildJsonGenerator
}
