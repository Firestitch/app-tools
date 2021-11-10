#!/usr/bin/env node

var spawn = require('child_process').spawn;
var console = require('./console');


module.exports = {
  exec: function(cmd, args, options) {
		console.log(`${cmd} ${args.join(' ')}`);
    return spawn(cmd, args,  
			{
				...options,
				shell: true, 
				stdio: "inherit" 
			}
		);		
  },
}
