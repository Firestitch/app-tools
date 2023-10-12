#!/usr/bin/env node

const fs = require('fs');
const prompts = require('prompts');
const env = require('./env');
const path = require('path');
const { from } = require('rxjs');
const { tap } = require('rxjs/operators');


class BuildJsonGenerator {
  version = null;
  name = null;
  packageJson = null;
  nextVersion = null;

  constructor() {
    this.packageJson = env.packageJson();
    this.version = this.packageJson.version;
    this.name = this.packageJson.name;
    this.nextVersion = this.version
      .replace(/(\d+$)/, (value, part) => {
        return Number(part) + 1
      });
  }

  promptVersion() {
    const nextPatchVersion = this.version.replace(/(\d+)$/, (value, part) => { 
      return Number(part) + 1 
    });

    const nextMinorVersion = this.version.replace(/(\d+)\.(\d+)\.(\d+)$/, (value, major, minor) => { 
      return `${major}.${Number(minor) + 1}.0`;
    });

    const nextMajorVersion = this.version.replace(/(\d+)\.(\d+)\.(\d+)$/, (value, major) => { 
      return `${Number(major) + 1}.0.0`;
    });

    return from(
      prompts([
        {
          type: 'select',
          name: 'version',
          message: 'Select a version',
          choices: [
            { title: `Next patch version ${nextPatchVersion}`, value: nextPatchVersion },
            { title: `Next minor version ${nextMinorVersion}`, value: nextMinorVersion },
            { title: `Next major version ${nextMajorVersion}`, value: nextMajorVersion },
            { title: `Current version ${this.version}`, value: this.version },
            { title: 'Custom version', value: 'custom' }
          ],
          initial: 0
        },
        {
          type: (value) => {
            return value === 'custom' ? 'text' : null;
          },
          name: 'version',
          message: 'Please enter the version number?',
          initial: this.version,
        }
      ])
    )
    .pipe(
      tap(({ version }) => {
        this.version = version; 
      }),
    );
  };

  savePackageJson(version) {
    this.packageJson.version = version;
    fs.writeFileSync(env.packageJsonFile(), JSON.stringify(this.packageJson, null, 2).trim());
  }

  saveBuildJson() {
    var data = JSON.stringify({
      name: this.name,
      version: this.version,
      date: new Date().toISOString(),
    });

    fs.writeFileSync(path.join(env.distDir(), 'assets/build.json'), data);

    return this;
  }
}

module.exports = {
  BuildJsonGenerator: BuildJsonGenerator
}

