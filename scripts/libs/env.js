#!/usr/bin/env node

var path = require('path');


module.exports = {

	_src: null,
	_project: null,

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
		if(this._src) {
			return this._src;
		}

		const sourceRoot = this.angularJson().projects[this.project()].sourceRoot;

		return path.join(this.frontendDir(), sourceRoot);
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
  angularJson: function() {
    return require(path.join(this.frontendDir(), 'angular.json'));
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
		if(this.arg('project')) {
			this._project = this.arg('project');
		}

		if(!this._project) {
			this._project = Object.keys(this.angularJson().projects)[0];
		}
		
		return this._project;
	},
	zipName: function() {
		return this.arg('zipName') || '';
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
	outputHashing: function() {
		return this.arg('outputHashing', 'all');
	},
	platform: function() {
		return this.arg('platform', 'web');
	},
	platformWeb: function() {
		return this.platform() === 'web';
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
