#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const envFile = path.join(__dirname, '../../src/environments/env.ts');

var data = {};
var re = new RegExp('npm_config_tools_(.*)');

Object.keys(process.env).forEach((name) => {
	var match = name.match(re);
	if (match) {
		var value = process.env[name];
		data[match[1]] = value;
	}
});

data = JSON.stringify(data);

var output = 'export const env = ' + data + ';';

console.log('\x1b[36m%s\x1b[0m','Env Variables (env.ts) ',data);

fs.writeFileSync(envFile, output);

process.exit(0);