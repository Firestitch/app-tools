#!/usr/bin/env node

var spawn = require('child_process').spawn;
var console = require('./console');
var env = require('./env');


module.exports = {
  exec: function(cmd, args, options) {
		console.log(`${cmd} ${args.join(' ')}`);
    var process = spawn(cmd, args,  
			{
				...options,
				shell: true, 
				stdio: "inherit" 
			}
		);	

		process.on('close', function (code) {
			if(code) {
				env.getProcess().exit(code);
			}
		});

		return process;
  },
}
