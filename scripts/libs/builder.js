#!/usr/bin/env node

var { BuildJsonGenerator } = require('./build-json-generator');
var { EnvGenerator } = require('./env-generator');


class Builder {
  options = {};
  envGenerator = null;
  buildJsonGenerator = null;

  constructor(options) { 
    this.options = options;
    this.envGenerator = new EnvGenerator(this.options.env, this.options.platform);
    this.buildJsonGenerator = new BuildJsonGenerator();
  }

  init() {
    this.generateEnv();
    this.generateBuildJson();
    return Promise.resolve();
  }
  
  generateEnv() {
    this.envGenerator.save();
  }

  generateBuildJson() {
    this.buildJsonGenerator.save();
  }
}

module.exports = {
  Builder: Builder
}
