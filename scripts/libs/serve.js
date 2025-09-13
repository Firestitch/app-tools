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

    this.generateEnv();
    var args = [
      'serve',
      `--port=${env.port()}`,
      '--host=::1',
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
}

module.exports = {
  Serve: Serve,
};