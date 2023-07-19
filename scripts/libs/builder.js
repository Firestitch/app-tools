#!/usr/bin/env node

var { BuildJsonGenerator } = require('./build-json-generator');
const env = require('./env');
var { EnvGenerator } = require('./env-generator');


class Builder {
  configuration = null;
  envGenerator = null;
  buildJsonGenerator = null;

  constructor(configuration) { 
    this.configuration = configuration;
    this.envGenerator = new EnvGenerator(configuration, env.native());
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
