#!/usr/bin/env node

const console  = require('./console');
const build = require('./build-json');
const exec = require('child_process').exec;

var cmd = 'cd ../../ && git name-rev --name-only HEAD';

exec(cmd, (err, stdout, stderr) => {

	let version = stdout.trim();

	if (version) {
		version = version.split('/').pop();
		console.log('Building build.json with branch version: ' + version);
	}

	if (stderr) {
		console.error('Failed to get the current branch: ' + stderr);
	}

	build.save(version);
});
