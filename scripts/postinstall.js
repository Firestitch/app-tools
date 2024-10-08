#!/usr/bin/env node

var path = require("path");
var cpx = require("cpx2");
var fs = require('fs');
var childProcess = require('child_process');
const env = require('./libs/env');
const console = require("./libs/console");

try {

  require(env.packageJsonFile());
  var dir2 = path.join(env.instanceDir(),'.vscode');

  try {
    childProcess.exec(`cd ${env.instanceDir()} && git submodule deinit -f .vscode`);
    childProcess.exec(`cd ${env.instanceDir()} && git rm -f .vscode`);
    childProcess.exec(`cd ${env.instanceDir()} && git commit -m "Removed .vscode submodule"`);
    childProcess.exec(`cd ${env.instanceDir()} && git push`);    
  } catch(e) {
    console.log('App-tool postinstall Git submodule deinit', e);
  }

  try {
    fs.rmSync(dir2, { recursive: true, force: true });
  } catch(e) {
    console.log('App-tool postinstall rmSync', e);
  }

  if (!fs.existsSync(dir2)) {
      fs.mkdirSync(dir2);
  }

  const dir1 = path.join(process.cwd(),'../assets/.vscode') + '/*';
  cpx.copy(dir1, dir2);
} catch(e) {
  console.log('App-tool postinstall', e);
}