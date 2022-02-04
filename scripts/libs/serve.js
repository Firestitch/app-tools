const { Builder } = require('./builder');
var cmd = require('./cmd');


class Serve extends Builder {

  run() {
    this.init()
    .then(() => {
      var args = [
        'serve',
        `--port=${this.options.port}`,      
        '--host=::1',
        '--disable-host-check',
        `--proxy-config=proxies/${this.options.env}.conf.json`, 
        `--configuration=${this.options.env}`,
        `--live-reload=${this.options.liveReload}`
      ];
      
      if(this.options.secure) {
        args = [
          ...args,
          '--ssl',
          '--ssl-key=tools/ssl/localhost.key',
          '--ssl-cert=tools/ssl/localhost.crt',
        ];
      }
      
      cmd.exec('ng', args, { cwd: '../' });
    });
  }
}

module.exports = {
  Serve: Serve,
};