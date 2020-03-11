#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const buildJson = path.join(__dirname, '../../src/assets/build.json');
const packageJson = require(path.join(__dirname, '../../package.json'));

module.exports = {
  save: function(version) {
    const data = JSON.stringify(this.create(version));
    fs.writeFileSync(buildJson, data);
  },
  create: function(version) {
    return {
      name: packageJson.name,
      date: new Date().toISOString(),
      version: version
    }
  }
}
