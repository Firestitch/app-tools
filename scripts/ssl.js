#!/usr/bin/env node

const ssl = require('./libs/ssl');
const console = require('./libs/console');


const commands = {
  trust: ssl.trust,
  untrust: ssl.untrust,
  info: ssl.info,
  reissue: ssl.reissue,
  generate: ssl.generate,
};

const command = process.argv[2] || 'info';

if (!commands[command]) {
  console.error(`Unknown command "${command}". Use one of: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

process.exit(commands[command]());
