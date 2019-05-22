#!/usr/bin/env node

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[36m%s\x1b[0m';
const RESET = '\x1b[0m';

const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const file = path.join(__dirname, '../../src/assets/build.json');

var data = { date: new Date().toISOString() };

var cmd = 'cd ../../ && git rev-parse --abbrev-ref HEAD';

exec(cmd, (err, stdout, stderr) => {

	const name = stdout.trim();

	if (name) {

		console.log(BLUE,'Building build.json with branch name ', name);
		data.name = name;
	}

	if (stderr) {
		console.log(RED,'Failed to get the current branch', stderr);
	}

	data = JSON.stringify(data);

	fs.writeFileSync(file, data);
});