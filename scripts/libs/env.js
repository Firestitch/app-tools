#!/usr/bin/env node

var path = require('path');


// Every input the tools take — CLI flags, package.json, angular.json — is read
// through here. See ARCHITECTURE.md for how the three layers combine.
module.exports = {

	_src: null,
	_project: null,

	process: function() {
		return process;
	},
  // Where npm runs the script: the `frontend` directory.
  frontendDir: function() {
    return process.cwd();
  },
  // Its parent — the repo root, where git and sibling packages (mcp, backend) live.
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
		const architect = this.angularJson().projects[this.project()].architect;
		const outputPath = architect.build.options.outputPath;
		const base = typeof outputPath === 'string' ? outputPath : outputPath.base;
		const dir = this.outputDir() || base;

    return path.join(this.frontendDir(), dir);
  },
	buildJsonFile: function() {
    return path.join(this.srcDir(), 'assets/build.json');
  },
  // require() caches, so this object is shared and does NOT refresh after the file
  // is written. Capture values before a write rather than re-reading afterwards.
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
	// The dev-server host. Explicit --host wins; otherwise the project's own
	// serve options in angular.json, so a multi-project workspace can give each
	// app its own hostname. Null means "no opinion" — the caller falls back to
	// the package-name-derived host.
	host: function() {
		return this.arg('host') || this.projectServeOption('host') || null;
	},
	// One project's serve.options.<name> from angular.json, or null.
	projectServeOption: function(name) {
		const architect = this.angularJson().projects[this.project()].architect || {};
		const options = (architect.serve && architect.serve.options) || {};

		return options[name] !== undefined ? options[name] : null;
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
	proxyConfig: function() {
		return this.arg('proxyConfig');
	},
	liveReload: function() {
		return this.arg('live-reload') ? this.arg('live-reload') : 'false';
	},
	secure: function() {
		return this.arg('secure');
	},
	outputDir: function() {
		return this.arg('outputDir');
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
	// An option in three forms: --name=value, npm_config_name (npm --name=value),
	// then the caller's own default — which is where package.json ￫ config is read.
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
