#!/usr/bin/env node
'use strict';

require('log-timestamp');

var path = require('path')

  , async = require('async')
  , connect = require('connect')
  , express = require('express')
  , mkdirp = require('mkdirp')
  , taskist = require('taskist')

  , config = require('./config')
  , log = require('./lib/log')

  , GitHubApi = require('github');

var github = new GitHubApi({
  version: '3.0.0',
  protocol: 'https',
  timeout: 5000
});

if(config.githubToken) {
  github.authenticate({
    type: 'oauth',
    token: config.githubToken
  });
}

var tasks = require('./tasks')(config.output, github);


if(require.main === module) {
  main();
}

module.exports = main;
function main() {
  handleExit();

  async.series([
    mkdirp.bind(null, config.output),
    serve.bind(null, config),
    initTasks
  ], function(err) {
    if(err) {
      return console.error(err);
    }
  });
}

function handleExit() {
  process.on('exit', terminator);

  ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS',
    'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGPIPE', 'SIGTERM'
  ].forEach(function(element) {
      process.on(element, function() {
        terminator(element);
      });
    });
}

function serve(config, cb) {
  var app = express();
  var hour = 3600 * 1000;
  var staticPath = path.join(__dirname, config.output);

  app.use('/data', express['static'](staticPath, {
    maxAge: hour
  }));

  var env = process.env.NODE_ENV || 'development';
  if(env === 'development') {
    app.use(connect.errorHandler());
  }

  app.listen(config.port, function(err) {
    if(err) {
      return cb(err);
    }

    log.info('Node (version: ' + process.version + ') ' + process.argv[1] + ' started on ' + config.port + ' ...');
    cb();
  });
}

function initTasks(cb) {
  log.info('Initializing tasks');
  taskist(config.tasks, tasks, {
    instant: cb,
    series: true
  });
}

function terminator(sig) {
  if(typeof sig === 'string') {
    var s = 'Received ' + sig + ' - terminating Node server ...';
    log.info(s);
    log.end();

    process.exit(1);
  }

  log.info('Node server stopped.');
}
