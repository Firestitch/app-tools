#!/usr/bin/env node

const console  = require('./console');
const fs = require('fs');
const path = require('path');
const build = require('./build-json');
const exec = require('child_process').exec;
const envFile = path.join(__dirname, '../../src/environments/env.ts');
const packageJson = require(path.join(__dirname, '../../package.json'));

var data = { build: {} };
var re = new RegExp('npm_config_(platform|env)');
Object.keys(process.env).forEach((name) => {
	var match = name.match(re);
	if (match) {
		var value = process.env[name];
		data[match[1]] = value;
	}
});

new Promise((resolve, reject) => {

	var cmd = 'cd ../../ && git name-rev --name-only HEAD';
	exec(cmd, (err, stdout, stderr) => {

		let version = stdout.trim();

		if (version) {
			version = version.split('/').pop();
      console.log('Building build.json with branch version ' + version);
      data.build = build.create(version);
		}

		resolve();
	});
})
.then(() => {

	data = JSON.stringify(data);

	var output = 'export const env = ' + data + ';';
	console.log('Env Variables (env.ts) ' + data);

	fs.writeFileSync(envFile, output);
});
