const { Builder } = require('./builder');
var cmd = require('./cmd');
var env = require('./env');
var fs = require('fs');
var path = require('path');


class Serve extends Builder {

  serve() {

    let proxyConfig;

    if(env.proxyConfig()) {
      proxyConfig = this.proxyConfig();
    }

    if (fs.existsSync(`proxies/${this.configuration}.conf.js`)) {
      proxyConfig = `proxies/${this.configuration}.conf.js`;
    }

    if (!proxyConfig) {
      if (fs.existsSync(`proxies/${this.configuration}.conf.json`)) {
        proxyConfig = `proxies/${this.configuration}.conf.json`;
      }
    }

    const host = this.extractHostFromProxy() || '::1';

    this.generateEnv();
    var args = [
      'serve',
      `--port=${env.port()}`,
      `--host=${host}`,
      `--live-reload=${env.liveReload()}`,
      `--proxy-config=${proxyConfig}`,
      `--configuration=${this.configuration}`,
    ];

    if (env.project()) {
      args.push(`--project=${env.project()}`);
    }

    if (env.secure()) {
      args = [
        ...args,
        '--ssl',
        '--ssl-key=node_modules/@firestitch/app-tools/ssl/localhost.key',
        '--ssl-cert=node_modules/@firestitch/app-tools/ssl/localhost.crt',
      ];
    }

    return cmd.exec('ng', args);
  }

  extractHostFromProxy() {
    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      let name = pkg.name;
      if (typeof name !== 'string' || !name) {
        return null;
      }
      if (name.startsWith('@')) {
        const parts = name.split('/');
        name = parts.length > 1 ? parts.slice(1).join('-') : name.replace(/^@/, '');
      }
      return `${name}.local.firestitch.com`;
    } catch (e) {}

    return null;
  }
}

module.exports = {
  Serve: Serve,
};
