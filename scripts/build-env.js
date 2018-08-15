#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

var data = {};
Object.keys(process.env).forEach((name) => {

	var match = name.match(/npm_package_config_(.*)/);
	if (match) {
		var value = process.env[name];
		data[match[1]] = value;
	}
});


const envFile = path.join(__dirname, '../../src/environments/env.ts');

data = JSON.stringify(data);

var output = 'export const env = ' + data + ';';

fs.writeFileSync(envFile, output);

process.exit(0);