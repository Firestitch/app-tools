#!/usr/bin/env node

var path = require('path');


module.exports = {
	getProcess: function() {
		return process;
	},
  getFrontendDir: function() {
    return process.cwd();
  },
  getInstanceDir: function() {
    return path.join(this.getFrontendDir(), '..');
  },
  getSrcDir: function() {
		const src = this.getArg('src') ? this.getArg('src') : 'src';
    return path.join(this.getFrontendDir(), src);
  },
  getDistDir: function() {
    return path.join(this.getFrontendDir(), 'dist');
  },
	getBuildJsonFile: function() {
    return path.join(this.getSrcDir(), 'assets/build.json');
  },
  getPackageJson: function() {
    return require(this.getPackageJsonFile());
  },
  getPackageJsonFile: function() {
    return path.join(this.getFrontendDir(), 'package.json');
  },
	getConfiguration: function(default_ = 'local') {
		var packageJson = this.getPackageJson();
		return this.getArg('configuration') || packageJson.config.configuration || this.getArg('env') || packageJson.config.env || default_;
	},
	getPort: function(default_ = 9999) {
		var packageJson = this.getPackageJson();
		return this.getArg('port') || packageJson.config.port || default_;
	},
	getProject: function() {
		return this.getArg('project');
	},
	isNative: function() {
		return !!this.getArg('native');
	},
	getArg(name, default_ = null) {
		const arg = (process.argv || [])
			.map((arg) => {
				return arg.match(/--([^=]+)=(.*)/);
			})
			.find((arg) => {
				return arg && arg[1] === name;
			});

		if(arg) {
			return arg[2];
		}

		name = String(name).replace('-', '_');
		return process.env[`npm_config_${name}`] || default_;
	}
}
