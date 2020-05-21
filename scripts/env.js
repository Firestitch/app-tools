#!/usr/bin/env node

const console  = require('./console');
const fs = require('fs');
const path = require('path');
const envFile = path.join(__dirname, '../../src/environments/env.ts');
const buildJson = require(path.join(__dirname, '../../src/assets/build.json'));

var data = { build: buildJson };
var re = new RegExp('npm_config_(platform|env)');
Object.keys(process.env).forEach((name) => {
	var match = name.match(re);
	if (match) {
		var value = process.env[name];
		data[match[1]] = value;
	}
});

data = JSON.stringify(data);

var output = 'export const env = ' + data + ';';
console.log('Env Variables (env.ts) ' + data);

fs.writeFileSync(envFile, output);

