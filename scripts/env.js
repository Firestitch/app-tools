#!/usr/bin/env node

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[36m%s\x1b[0m';
const RESET = '\x1b[0m';

const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const envFile = path.join(__dirname, '../../src/environments/env.ts');

var build = { date: null, name: null };
var data = { build: build };
var re = new RegExp('npm_config_(platform|env)');
Object.keys(process.env).forEach((name) => {
	var match = name.match(re);
	if (match) {
		var value = process.env[name];
		data[match[1]] = value;
	}
});

new Promise((resolve, reject) => {

	var cmd = 'cd ../../ && git rev-parse --abbrev-ref HEAD';
	exec(cmd, (err, stdout, stderr) => {

		const name = stdout.trim();

		if (name) {
			console.log(BLUE,'Building build.json with branch name ', name);
			build.name = name;
			build.date = new Date().toISOString();
		}

		resolve();
	});
})
.then(() => {

	data = JSON.stringify(data);

	var output = 'export const env = ' + data + ';';
	console.log(BLUE,'Env Variables (env.ts) ',data);

	fs.writeFileSync(envFile, output);
});