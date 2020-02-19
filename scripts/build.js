#!/usr/bin/env node

const console  = require('./console');
const build = require('./build-json');
const exec = require('child_process').exec;

var cmd = 'cd ../../ && git name-rev --name-only HEAD';

exec(cmd, (err, stdout, stderr) => {

	let name = stdout.trim();

	if (name) {
		name = name.split('/').pop();
		console.log('Building build.json with branch name: ' + name);
	}

	if (stderr) {
		console.error('Failed to get the current branch: ' + stderr);
	}

	build.save(name);
});