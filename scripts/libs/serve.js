const { Builder } = require('./builder');
var cmd = require('./cmd');
var env = require('./env');


class Serve extends Builder {

  serve() {
    this.generateEnv();
    var args = [
      'serve',
      `--port=${env.port()}`,
      '--host=::1',
      `--live-reload=${env.liveReload()}`,
      `--proxy-config=proxies/${this.configuration}.conf.json`,
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