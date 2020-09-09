#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const buildJson = path.join(__dirname, '../../src/assets/build.json');
const packageJson = require(path.join(__dirname, '../../package.json'));

module.exports = {
  save: function() {
    const data = JSON.stringify(this.create());
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
