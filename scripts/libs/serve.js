const { Builder } = require('./builder');
var cmd = require('./cmd');
var env = require('./env');
var fs = require('fs');


class Serve extends Builder {

  serve() {

    let proxyConfig;

    if (fs.existsSync(`proxies/${this.configuration}.conf.js`)) {
      proxyConfig = `proxies/${this.configuration}.conf.js`;
    }

    if (!proxyConfig) {
      if (fs.existsSync(`proxies/${this.configuration}.conf.json`)) {
        proxyConfig = `proxies/${this.configuration}.conf.json`;
      }
    }

    const host = this.extractHostFromProxy(proxyConfig) || '::1';

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

  extractHostFromProxy(proxyConfig) {
    if (!proxyConfig) {
      return null;
    }

    try {
      if (proxyConfig.endsWith('.json')) {
        const config = JSON.parse(fs.readFileSync(proxyConfig, 'utf-8'));
        const apiTarget = config['/api/'] && config['/api/'].target;
        if (apiTarget) {
          return new URL(apiTarget).hostname;
        }
      } else if (proxyConfig.endsWith('.js')) {
        const config = require(require('path').resolve(proxyConfig));
        const entries = Array.isArray(config) ? config : [];
        const apiEntry = entries.find(e => e.context && e.context.includes('/api/'));
        if (apiEntry && apiEntry.target) {
          return new URL(apiEntry.target).hostname;
        }
      }
    } catch (e) {}

    return null;
  }
}

module.exports = {
  Serve: Serve,
};
