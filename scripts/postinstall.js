#!/usr/bin/env node

var path = require("path");
var fs = require('fs');
const env = require('./libs/env');
const console = require("./libs/console");

/** Copy a file or directory tree; skip `.git` (package assets may carry submodule metadata). */
function copyAssetEntry(from, to) {
  var st = fs.lstatSync(from);
  if (st.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    var names = fs.readdirSync(from);
    for (var k = 0; k < names.length; k++) {
      if (names[k] === '.git') continue;
      copyAssetEntry(path.join(from, names[k]), path.join(to, names[k]));
    }
  } else if (st.isFile()) {
    fs.copyFileSync(from, to);
  }
}

try {

  var instanceDir = path.join(__dirname,'../../../../../');
  var assetsDir = path.join(__dirname, '../assets');

  console.log('App-tool postinstall for' + instanceDir);

  if (!fs.existsSync(assetsDir)) {
    console.log('App-tool postinstall: assets missing at ' + assetsDir);
  } else {
    var entries = fs.readdirSync(assetsDir, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      var ent = entries[i];
      var src = path.join(assetsDir, ent.name);
      var dest = path.join(instanceDir, ent.name);
      try {
        fs.rmSync(dest, { recursive: true, force: true });
      } catch (e) {
        console.log('App-tool postinstall rmSync', e);
      }
      console.log('App-tool copy ' + src + ' to ' + dest);
      copyAssetEntry(src, dest);
    }
    var claudeSrc = path.join(assetsDir, 'CLAUDE.md');
    var cursorRulesDest = path.join(instanceDir, '.cursorrules');
    if (fs.existsSync(claudeSrc)) {
      console.log('App-tool copy ' + claudeSrc + ' to ' + cursorRulesDest);
      fs.copyFileSync(claudeSrc, cursorRulesDest);
    }
  }
} catch(e) {
  console.log('App-tool postinstall', e);
}

