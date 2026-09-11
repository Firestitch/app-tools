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

    if(!this.version) {
      throw Error('package.json version does not exist');
    }

    this.nextVersion = this.version
      .replace(/(\d+$)/, (value, part) => {
        return Number(part) + 1
      });
  }

  // Ask which version to release, and remember it on this.version — saveBuildJson()
  // reads that field, so this must run before either save.
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
          // Patch first: it is what almost every release is, and it is the one the
          // highlighted default should land on. Current version sits near the
          // bottom — re-packaging the same version skips the commit and tag
          // entirely, so it is a deliberate choice rather than a likely one.
          choices: [
            { title: `Next patch version ${nextPatchVersion}`, value: nextPatchVersion },
            { title: `Next minor version ${nextMinorVersion}`, value: nextMinorVersion },
            { title: `Next major version ${nextMajorVersion}`, value: nextMajorVersion },
            { title: `Current version ${this.version}`, value: this.version },
            { title: 'Custom version', value: 'custom' },
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

  // The repo's own version. In a package run this is the first write of the flow,
  // and it is what the release is committed and tagged as.
  savePackageJson(version) {
    this.packageJson.version = version;
    fs.writeFileSync(env.packageJsonFile(), JSON.stringify(this.packageJson, null, 2).trim());
  }

  // What the running app reports about itself. Takes no argument — the version
  // comes from this.version, set by promptVersion().
  saveBuildJson() {
    var data = JSON.stringify({
      name: this.name,
      version: this.version,
      date: new Date().toISOString(),
    });

    if(!fs.existsSync(path.join(env.distDir(), 'assets'))) {
      fs.mkdirSync(path.join(env.distDir(), 'assets'));
    }
    
    fs.writeFileSync(path.join(env.distDir(), 'assets/build.json'), data);

    return this;
  }
}

module.exports = {
  BuildJsonGenerator: BuildJsonGenerator
}

