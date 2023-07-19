#!/usr/bin/env node

var fs = require('fs');
var prompts = require('prompts');
var env = require('./env');


class BuildJsonGenerator {
  version = null;
  name = null;
  packageJson  = null;

  constructor() { 
    this.packageJson = env.packageJson();
    this.version = this.packageJson.version;
    this.name = this.packageJson.name;
  }  

  async promptVersion() {
    return new Promise((resolve) => {
      const onSubmit = (prompt, version) => {
        this.version = version;   
        this.packageJson.version = this.version;    
        fs.writeFileSync(env.packageJsonFile(), JSON.stringify(this.packageJson,null,2).trim());  
        console.log('');
        resolve(version);
      };

      prompts({
        type: 'text',
        name: 'version',
        message: 'Please enter the version number?',
        initial: this.version,
      }, { onSubmit });
    });
  }

  save() {
    var data = JSON.stringify({
      name: this.name,
      version: this.version,
      date: new Date().toISOString(),
    });

    fs.writeFileSync(env.buildJsonFile(), data);
  }
}


module.exports = {
  BuildJsonGenerator: BuildJsonGenerator
}
