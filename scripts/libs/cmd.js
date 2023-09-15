#!/usr/bin/env node

const spawn = require('child_process').spawn;
const { Observable } = require('rxjs');
const console = require('./console');
const env = require('./env');


module.exports = {
	exec: function (cmd, args, options) {
		return new Observable((observer) => {
			args = args || [];
			console.log(`${cmd} ${args.join(' ')}`);
			options = options || {};
			
			if(!options.capture) {
				options.stdio = 'inherit';
			}
	
			var process = spawn(cmd, args,
				{
					...options,
					shell: true,
				}
			);
			
			let stdout = '';
			if(process.stdout) {
				process.stdout.setEncoding('utf8');
				process.stdout.on('data', (data) => {
					stdout += data.toString();
				});
			}

			process.on('close', function (code) {
				if (code) {
					env.process().exit(code);
					observer.error(code);
					return;
				}

				observer.next(stdout);
				observer.complete();
			});
		});

	},
}
