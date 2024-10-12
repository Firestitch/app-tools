#!/usr/bin/env node

var path = require("path");
var cpx = require("cpx2");
var fs = require('fs');
var childProcess = require('child_process');
const env = require('./libs/env');
const console = require("./libs/console");

try {

  var instanceDir = path.join(__dirname,'../../../../../');
  
  console.log('App-tool postinstall for' + instanceDir);
 
  var dir2 = path.join(instanceDir,'.vscode');

  try {
    childProcess.exec(`cd ${instanceDir} && git submodule deinit -f .vscode`);
    childProcess.exec(`cd ${instanceDir} && git rm -f .vscode`);
    childProcess.exec(`cd ${instanceDir} && git commit -m "Removed .vscode submodule"`);
    childProcess.exec(`cd ${instanceDir} && git push`);    
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

  const dir1 = path.join(__dirname,'../assets/.vscode') + '/*';
  console.log('App-tool copy from ' + dir1 + ' to ' + dir2);
  cpx.copy(dir1, dir2);
} catch(e) {
  console.log('App-tool postinstall', e);
}