#!/usr/bin/env node

var path = require('path');

module.exports = {
  getFrontendDir: function() {
    return path.join(this.getInstanceDir(), 'frontend');
  }, 
  getInstanceDir: function() {
    return path.join(__dirname, '../../../../');
  }, 	
  getDistDir: function() {
    return path.join(this.getFrontendDir(), 'dist');
  },  
	getBuildJsonFile: function() {
    return path.join(this.getFrontendDir(), 'src/assets/build.json');
  },
  getPackageJson: function() {
    return require(this.getPackageJsonFile());
  },
  getPackageJsonFile: function() {
    return path.join(this.getFrontendDir(), 'package.json');
  },	
	getEnv: function(default_ = 'local') {
		var packageJson = this.getPackageJson();
		return this.getArg('env') || packageJson.config?.env || default_;		
	},	
	getPort: function(default_ = 9999) {
		var packageJson = this.getPackageJson();
		return this.getArg('port') || packageJson.config?.port || default_;		
	},	
	getPlatform: function(default_ = 'web') {
		var packageJson = this.getPackageJson();
		return this.getArg('platform') || packageJson.config?.platform || default_;		
	},
	isPlatformApp: function() {
		return this.getPlatform() === 'app';
	},
	getArg(name, default_ = null) {
		name = String(name).replace('-', '_');
		return process.env[`npm_config_${name}`] || default_;
	}
}
