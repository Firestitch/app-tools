#!/usr/bin/env node

var console  = require('./console');
var fs = require('fs');
var path = require('path');
var envFile = path.join(__dirname, '../../src/environments/env.ts');
var buildJson = require(path.join(__dirname, '../../src/assets/build.json'));

var data = { build: buildJson };
var re = new RegExp('npm_config_(platform|env)');
Object.keys(process.env).forEach(function(name) {
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

