#!/usr/bin/env node

const spawn = require('child_process').spawn;
const path = require('path');
const { Observable, of } = require('rxjs');
const console = require('./console');
const env = require('./env');


module.exports = {
	// A hook is either a path to a JS file, which is require()d, or a shell
	// command. Both forms are accepted everywhere a hook is taken, so a hook can
	// start as a one-line command and grow into a script without the flag that
	// invokes it changing meaning.
	//
	// require() is synchronous and its return value is discarded, so a JS hook
	// cannot fail the run; a shell hook exits non-zero and aborts it. That is a
	// property of the form chosen, not of the hook point.
	hook: function (value, options) {
		if (!value) {
			return of(null);
		}

		// A bare path — no spaces — is a file to require. `node build.js` also ends
		// in .js but is a command, so the extension alone can't decide it.
		if (/^\S+\.[cm]?js$/.test(value)) {
			require(path.join(env.process().cwd(), value));

			return of(null);
		}

		return this.exec(value, [], options);
	},

	// Spawn a command as an observable. Always shell: true, so the command string
	// may contain pipes, && and redirection.
	//
	// On a non-zero exit this calls process.exit() BEFORE erroring the observable,
	// so a failed command takes the whole run down on the spot. That is what
	// guarantees a failure can never reach the commit and tag at the end of a
	// package run — but it also means a downstream error handler never fires.
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
