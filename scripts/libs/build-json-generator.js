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
    return from(
      prompts([
        {
          type: 'select',
          name: 'version',
          message: 'Select a version',
          choices: [
            { title: `Next version ${this.nextVersion}`, value: this.nextVersion },
            { title: 'Current version', value: this.version },
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

  saveBuildJson(version) {
    var data = JSON.stringify({
      name: this.name,
      version: version,
      date: new Date().toISOString(),
    });

    fs.writeFileSync(path.join(env.distDir(), 'assets/build.json'), data);

    return this;
  }
}

module.exports = {
  BuildJsonGenerator: BuildJsonGenerator
}

