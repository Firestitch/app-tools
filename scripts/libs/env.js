#!/usr/bin/env node

var path = require('path');


module.exports = {
	process: function() {
		return process;
	},
  frontendDir: function() {
    return process.cwd();
  },
  instanceDir: function() {
    return path.join(this.frontendDir(), '..');
  },
  srcDir: function() {
		const src = this.arg('src') ? this.arg('src') : 'src';
    return path.join(this.frontendDir(), src);
  },
  distDir: function() {
    return path.join(this.frontendDir(), this.outputDir());
  },
	buildJsonFile: function() {
    return path.join(this.srcDir(), 'assets/build.json');
  },
  packageJson: function() {
    return require(this.packageJsonFile());
  },
  packageJsonFile: function() {
    return path.join(this.frontendDir(), 'package.json');
  },
	configuration: function(default_ = 'local') {
		var packageJson = this.packageJson();
		return this.arg('configuration') || packageJson.config.configuration || this.arg('env') || packageJson.config.env || default_;
	},
	port: function(default_ = 9999) {
		var packageJson = this.packageJson();
		return this.arg('port') || packageJson.config.port || default_;
	},
	project: function() {
		return this.arg('project');
	},
	liveReload: function() {
		return this.arg('live-reload') ? this.arg('live-reload') : 'false';
	},
	secure: function() {
		return this.arg('secure');
	},
	outputDir: function() {
		return this.arg('outputDir', 'dist');
	},
	native: function() {
		return !!this.arg('native');
	},
	postBuild: function() {
		return this.arg('postBuild');
	},
	preBuild: function() {
		return this.arg('preBuild');
	},
	arg(name, default_ = null) {
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
