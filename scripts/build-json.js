#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var buildJson = path.join(__dirname, '../../src/assets/build.json');
var packageJson = require(path.join(__dirname, '../../package.json'));

module.exports = {
  save: function() {
    var data = JSON.stringify(this.create());
    fs.writeFileSync(buildJson, data);
  },
  create: function() {
    return {
      name: packageJson.name,
      date: new Date().toISOString(),
      version: packageJson.version
    }
  }
}
