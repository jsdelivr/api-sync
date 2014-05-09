#!/usr/bin/env node
'use strict';

require('log-timestamp');

var path = require('path');

var async = require('async');
var connect = require('connect');
var express = require('express');
var mkdirp = require('mkdirp');
var taskist = require('taskist');

var config = require('./config');

var GitHubApi = require('github');

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

        console.log(
            'Node (version: %s) %s started on %d ...',
            process.version,
            process.argv[1],
            config.port
        );

        cb();
    });
}

function initTasks(cb) {
    console.log('Initializing tasks');
    taskist(config.tasks, tasks, {
        instant: cb,
        series: true
    });
}

function terminator(sig) {
    if(typeof sig === 'string') {
        console.log('%s: Received %s - terminating Node server ...',
            Date(Date.now()), sig);

        process.exit(1);
    }

    console.log('%s: Node server stopped.', Date(Date.now()) );
}
