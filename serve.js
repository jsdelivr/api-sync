#!/usr/bin/env node
'use strict';

require('log-timestamp');

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
function main(cb) {
    cb = cb || noop;

    mkdirp(config.output, function(err) {
        if(err) {
            return cb(err);
        }

        console.log('Initializing tasks');
        initTasks();

        cb();
    });
}

function initTasks() {
    taskist(config.tasks, tasks, {
        instant: true,
        series: true
    });
}

function noop() {}
