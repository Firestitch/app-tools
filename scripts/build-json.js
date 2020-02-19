#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../../src/assets/build.json');

module.exports = {
  save: function(name) {
    const data = JSON.stringify({ name: name, date: new Date().toISOString() });
    fs.writeFileSync(file, data);
  }
}
