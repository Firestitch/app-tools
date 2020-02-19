#!/usr/bin/env node

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[36m%s\x1b[0m';
const RESET = '\x1b[0m';

module.exports = {

  error: function(msg) {
    console.log(RED, msg);
  },
  log: function(msg) {
    console.log(BLUE, msg);
  },
  success: function(msg) {
    console.log(GREEN, msg);
  }
}